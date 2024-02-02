import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as AtLeastOnceStorage from "../AtLeastOnceStorage.js"
import * as MessageState from "../MessageState.js"
import type * as RecipientBehaviour from "../RecipientBehaviour.js"
import * as RecipientBehaviourContext from "../RecipientBehaviourContext.js"
import * as Sharding from "../Sharding.js"

/** @internal */
export function runPendingMessageSweeperScoped(
  interval: Duration.Duration
): Effect.Effect<AtLeastOnceStorage.AtLeastOnceStorage | Sharding.Sharding | Scope.Scope, never, void> {
  return Effect.flatMap(AtLeastOnceStorage.Tag, (storage) =>
    pipe(
      Sharding.getAssignedShardIds,
      Effect.flatMap((shardIds) =>
        pipe(
          storage.sweepPending(shardIds),
          Stream.mapEffect((envelope) => Sharding.sendMessageToLocalEntityManagerWithoutRetries(envelope)),
          Stream.runDrain
        )
      ),
      Effect.delay(interval),
      Effect.catchAllCause(Effect.logError),
      Effect.forever,
      Effect.forkScoped,
      Effect.asUnit
    ))
}

/** @internal */
export function atLeastOnceRecipientBehaviour<R, Msg>(
  fa: RecipientBehaviour.RecipientBehaviour<R, Msg>
): RecipientBehaviour.RecipientBehaviour<R | AtLeastOnceStorage.AtLeastOnceStorage, Msg> {
  return Effect.gen(function*(_) {
    const storage = yield* _(AtLeastOnceStorage.Tag)
    const entityId = yield* _(RecipientBehaviourContext.entityId)
    const shardId = yield* _(RecipientBehaviourContext.shardId)
    const recipientType = yield* _(RecipientBehaviourContext.recipientType)
    const offer = yield* _(fa)
    return <A extends Msg>(message: A) =>
      pipe(
        storage.upsert(recipientType, shardId, entityId, message),
        Effect.zipRight(
          pipe(
            offer(message),
            Effect.tap(MessageState.match({
              onAcknowledged: () => Effect.unit,
              onProcessed: () => storage.markAsProcessed(recipientType, shardId, entityId, message)
            }))
          )
        )
      )
  })
}