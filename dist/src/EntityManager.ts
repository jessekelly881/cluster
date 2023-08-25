/**
 * @since 1.0.0
 */
import * as Duration from "@effect/data/Duration"
import { pipe } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as HashSet from "@effect/data/HashSet"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import type * as Queue from "@effect/io/Queue"
import * as RefSynchronized from "@effect/io/Ref/Synchronized"
import * as MessageQueue from "@effect/sharding/MessageQueue"
import * as PoisonPill from "@effect/sharding/PoisonPill"
import type * as RecipientBehaviour from "@effect/sharding/RecipientBehaviour"
import type * as RecipientType from "@effect/sharding/RecipientType"
import type * as ReplyChannel from "@effect/sharding/ReplyChannel"
import type * as ReplyId from "@effect/sharding/ReplyId"
import type * as ShardId from "@effect/sharding/ShardId"
import type * as Sharding from "@effect/sharding/Sharding"
import type * as ShardingConfig from "@effect/sharding/ShardingConfig"
import * as ShardingError from "@effect/sharding/ShardingError"

/**
 * @since 1.0.0
 * @category models
 */
export interface EntityManager<Req> {
  readonly send: (
    entityId: string,
    req: Req,
    replyId: Option.Option<ReplyId.ReplyId>,
    replyChannel: ReplyChannel.ReplyChannel<any>
  ) => Effect.Effect<
    never,
    ShardingError.ShardingEntityNotManagedByThisPodError | ShardingError.ShardingMessageQueueError,
    void
  >
  readonly terminateEntitiesOnShards: (
    shards: HashSet.HashSet<ShardId.ShardId>
  ) => Effect.Effect<never, never, void>
  readonly terminateAllEntities: Effect.Effect<never, never, void>
}

type EntityManagerEntry<Req> = readonly [
  messageQueue: Option.Option<MessageQueue.MessageQueue<Req>>,
  expirationFiber: Fiber.RuntimeFiber<never, void>,
  executionFiber: Fiber.RuntimeFiber<never, void>
]

/**
 * @since 1.0.0
 * @category constructors
 */
export function make<R, Req>(
  recipientType: RecipientType.RecipientType<Req>,
  behaviour_: RecipientBehaviour.RecipientBehaviour<R, Req>,
  sharding: Sharding.Sharding,
  config: ShardingConfig.ShardingConfig,
  options: RecipientBehaviour.EntityBehaviourOptions<R, Req> = {}
) {
  return Effect.gen(function*(_) {
    const entityMaxIdle = options.entityMaxIdleTime || Option.none()
    const messageQueueConstructor = options.messageQueueConstructor || MessageQueue.inMemory
    const env = yield* _(Effect.context<R>())
    const entities = yield* _(
      RefSynchronized.make<
        HashMap.HashMap<
          string,
          EntityManagerEntry<Req>
        >
      >(HashMap.empty())
    )
    const behaviour = (
      entityId: string,
      dequeue: Queue.Dequeue<Req | PoisonPill.PoisonPill>
    ) => Effect.provideContext(behaviour_(entityId, dequeue), env)

    function startExpirationFiber(entityId: string) {
      return pipe(
        Effect.sleep(
          pipe(
            entityMaxIdle,
            Option.getOrElse(() => config.entityMaxIdleTime)
          )
        ),
        Effect.zipRight(forkEntityTermination(entityId)),
        Effect.asUnit,
        Effect.interruptible,
        Effect.forkDaemon
      )
    }

    /**
     * Begins entity termination (if needed) by sending the PoisonPill, return the fiber to wait for completed termination (if any)
     */
    function forkEntityTermination(entityId: string) {
      return RefSynchronized.modifyEffect(entities, (map) =>
        pipe(
          HashMap.get(map, entityId),
          Option.match({
            // if no entry is found, the entity has succefully shut down
            onNone: () => Effect.succeed([Option.none(), map] as const),
            // there is an entry, so we should begin termination
            onSome: ([maybeQueue, expirationFiber, runningFiber]) =>
              pipe(
                maybeQueue,
                Option.match({
                  // termination has already begun, keep everything as-is
                  onNone: () => Effect.succeed([Option.some(runningFiber), map] as const),
                  // begin to terminate the queue
                  onSome: (queue) =>
                    pipe(
                      queue.offer(PoisonPill.make),
                      Effect.catchAllCause(Effect.logError),
                      Effect.as(
                        [
                          Option.some(runningFiber),
                          HashMap.set(map, entityId, [
                            Option.none(),
                            expirationFiber,
                            runningFiber
                          ])
                        ] as const
                      )
                    )
                })
              )
          })
        ))
    }

    function send(
      entityId: string,
      req: Req,
      replyId: Option.Option<ReplyId.ReplyId>,
      replyChannel: ReplyChannel.ReplyChannel<any>
    ): Effect.Effect<
      never,
      ShardingError.ShardingEntityNotManagedByThisPodError | ShardingError.ShardingMessageQueueError,
      void
    > {
      function decide(
        map: HashMap.HashMap<
          string,
          EntityManagerEntry<Req>
        >,
        entityId: string
      ) {
        return pipe(
          HashMap.get(map, entityId),
          Option.match({
            onNone: () =>
              Effect.flatMap(sharding.isShuttingDown, (isGoingDown) => {
                if (isGoingDown) {
                  // don't start any fiber while sharding is shutting down
                  return Effect.fail(ShardingError.ShardingEntityNotManagedByThisPodError(entityId))
                } else {
                  // queue doesn't exist, create a new one
                  return Effect.gen(function*(_) {
                    const queue = yield* _(pipe(
                      messageQueueConstructor(entityId),
                      Effect.provideSomeContext(env)
                    ))
                    const expirationFiber = yield* _(startExpirationFiber(entityId))
                    const executionFiber = yield* _(
                      pipe(
                        behaviour(entityId, queue.dequeue),
                        Effect.ensuring(
                          pipe(
                            RefSynchronized.update(entities, HashMap.remove(entityId)),
                            Effect.zipRight(queue.shutdown),
                            Effect.zipRight(Fiber.interrupt(expirationFiber))
                          )
                        ),
                        Effect.forkDaemon
                      )
                    )

                    return [
                      Option.some(queue),
                      HashMap.set(map, entityId, [Option.some(queue), expirationFiber, executionFiber] as const)
                    ] as const
                  })
                }
              }),
            onSome: ([maybeQueue, interruptionFiber, executionFiber]) =>
              pipe(
                maybeQueue,
                Option.match({
                  // queue exists, delay the interruption fiber and return the queue
                  onSome: () =>
                    pipe(
                      Fiber.interrupt(interruptionFiber),
                      Effect.zipRight(startExpirationFiber(entityId)),
                      Effect.map(
                        (fiber) =>
                          [
                            maybeQueue,
                            HashMap.set(map, entityId, [maybeQueue, fiber, executionFiber] as const)
                          ] as const
                      )
                    ),
                  // the queue is shutting down, stash and retry
                  onNone: () => Effect.succeed([Option.none(), map] as const)
                })
              )
          })
        )
      }

      return pipe(
        Effect.Do,
        Effect.tap(() => {
          // first, verify that this entity should be handled by this pod
          if (recipientType._tag === "EntityType") {
            return Effect.asUnit(Effect.unlessEffect(
              Effect.fail(ShardingError.ShardingEntityNotManagedByThisPodError(entityId)),
              sharding.isEntityOnLocalShards(recipientType, entityId)
            ))
          } else if (recipientType._tag === "TopicType") {
            return Effect.unit
          }
          return Effect.die("Unhandled recipientType")
        }),
        Effect.bind("test", () => RefSynchronized.modifyEffect(entities, (map) => decide(map, entityId))),
        Effect.tap((_) =>
          pipe(
            _.test,
            Option.match({
              onNone: () =>
                pipe(
                  Effect.sleep(Duration.millis(100)),
                  Effect.zipRight(send(entityId, req, replyId, replyChannel))
                ),
              onSome: (messageQueue) => {
                return pipe(
                  replyId,
                  Option.match({
                    onNone: () =>
                      pipe(
                        messageQueue.offer(req),
                        Effect.zipLeft(replyChannel.end)
                      ),
                    onSome: (replyId_) =>
                      pipe(
                        sharding.initReply(replyId_, replyChannel),
                        Effect.zipRight(messageQueue.offer(req))
                      )
                  })
                )
              }
            })
          )
        )
      )
    }

    const terminateAllEntities = pipe(
      RefSynchronized.get(entities),
      Effect.map(HashMap.keySet),
      Effect.flatMap(terminateEntities)
    )

    function terminateEntities(
      entitiesToTerminate: HashSet.HashSet<
        string
      >
    ) {
      return pipe(
        entitiesToTerminate,
        Effect.forEach(
          (entityId) =>
            pipe(
              forkEntityTermination(entityId),
              Effect.flatMap(Option.match({
                onNone: () => Effect.unit,
                onSome: (executionFiber) =>
                  pipe(
                    Effect.logDebug("Waiting for shutdown of " + entityId),
                    Effect.zipRight(Fiber.await(executionFiber)),
                    Effect.timeout(config.entityTerminationTimeout),
                    Effect.flatMap(Option.match({
                      onNone: () =>
                        Effect.logError(
                          `Entity ${
                            recipientType.name + "#" + entityId
                          } do not interrupted before entityTerminationTimeout (${
                            Duration.toMillis(config.entityTerminationTimeout)
                          }ms) . Are you sure that you properly handled PoisonPill message?`
                        ),
                      onSome: () =>
                        Effect.logDebug(
                          `Entity ${recipientType.name + "#" + entityId} cleaned up.`
                        )
                    })),
                    Effect.asUnit
                  )
              }))
            ),
          { concurrency: "inherit" }
        ),
        Effect.asUnit
      )
    }

    function terminateEntitiesOnShards(shards: HashSet.HashSet<ShardId.ShardId>) {
      return pipe(
        RefSynchronized.modify(entities, (entities) => [
          HashMap.filter(
            entities,
            (_, entityId) => HashSet.has(shards, sharding.getShardId(recipientType, entityId))
          ),
          entities
        ]),
        Effect.map(HashMap.keySet),
        Effect.flatMap(terminateEntities)
      )
    }

    const self: EntityManager<Req> = { send, terminateAllEntities, terminateEntitiesOnShards }
    return self
  })
}
