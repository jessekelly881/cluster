import * as HashSet from "@effect/data/HashSet";
import * as Option from "@effect/data/Option";
import * as Effect from "@effect/io/Effect";
import type * as RecipientBehaviour from "@effect/shardcake/RecipientBehaviour";
import type * as RecipientType from "@effect/shardcake/RecipientType";
import type * as ReplyChannel from "@effect/shardcake/ReplyChannel";
import type * as ReplyId from "@effect/shardcake/ReplyId";
import type * as ShardId from "@effect/shardcake/ShardId";
import type * as Sharding from "@effect/shardcake/Sharding";
import type * as ShardingConfig from "@effect/shardcake/ShardingConfig";
import * as ShardingError from "@effect/shardcake/ShardingError";
/**
 * @since 1.0.0
 * @category models
 */
export interface EntityManager<Req> {
    readonly send: (entityId: string, req: Req, replyId: Option.Option<ReplyId.ReplyId>, replyChannel: ReplyChannel.ReplyChannel<any>) => Effect.Effect<never, ShardingError.ShardingEntityNotManagedByThisPodError | ShardingError.ShardingMessageQueueError, void>;
    readonly terminateEntitiesOnShards: (shards: HashSet.HashSet<ShardId.ShardId>) => Effect.Effect<never, never, void>;
    readonly terminateAllEntities: Effect.Effect<never, never, void>;
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare function make<R, Req>(recipientType: RecipientType.RecipientType<Req>, behaviour_: RecipientBehaviour.RecipientBehaviour<R, Req>, sharding: Sharding.Sharding, config: ShardingConfig.ShardingConfig, options?: RecipientBehaviour.EntityBehaviourOptions<R, Req>): Effect.Effect<R, never, EntityManager<Req>>;
//# sourceMappingURL=EntityManager.d.ts.map