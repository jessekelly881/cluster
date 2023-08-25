/**
 * A module that provides utilities to build basic behaviours
 * @since 1.0.0
 */
import type * as Duration from "@effect/data/Duration";
import type * as Option from "@effect/data/Option";
import * as Effect from "@effect/io/Effect";
import type * as Queue from "@effect/io/Queue";
import type { MessageQueueConstructor } from "@effect/shardcake/MessageQueue";
import * as PoisonPill from "@effect/shardcake/PoisonPill";
/**
 * An alias to a RecipientBehaviour
 * @since 1.0.0
 * @category models
 */
export interface RecipientBehaviour<R, Req> {
    (entityId: string, dequeue: Queue.Dequeue<Req | PoisonPill.PoisonPill>): Effect.Effect<R, never, void>;
}
/**
 * An utility that process a message at a time, or interrupts on PoisonPill
 * @since 1.0.0
 * @category utils
 */
export declare const process: <Msg, R, E>(dequeue: Queue.Dequeue<PoisonPill.PoisonPill | Msg>, process: (message: Msg) => Effect.Effect<R, E, void>) => Effect.Effect<R, E, never>;
/**
 * An utility that process a message at a time, or interrupts on PoisonPill
 * @since 1.0.0
 * @category utils
 */
export type EntityBehaviourOptions<R, Req> = {
    messageQueueConstructor?: MessageQueueConstructor<R, Req>;
    entityMaxIdleTime?: Option.Option<Duration.Duration>;
};
//# sourceMappingURL=RecipientBehaviour.d.ts.map