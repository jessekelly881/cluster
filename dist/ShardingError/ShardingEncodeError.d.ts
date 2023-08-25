/**
 * @since 1.0.0
 */
import * as Data from "@effect/data/Data";
import * as Schema from "@effect/schema/Schema";
/**
 * @since 1.0.0
 * @category symbols
 */
export declare const ShardingEncodeErrorTag: "@effect/shardcake/ShardingEncodeError";
declare const ShardingEncodeErrorSchema_: Schema.Schema<{
    readonly _tag: "@effect/shardcake/ShardingEncodeError";
    readonly error: string;
}, Data.Data<{
    readonly _tag: "@effect/shardcake/ShardingEncodeError";
    readonly error: string;
}>>;
/**
 * @since 1.0.0
 * @category models
 */
export interface ShardingEncodeError extends Schema.To<typeof ShardingEncodeErrorSchema_> {
}
/**
 * @since 1.0.0
 * @category constructors
 */
export declare function ShardingEncodeError(error: string): ShardingEncodeError;
/**
 * @since 1.0.0
 * @category utils
 */
export declare function isShardingEncodeError(value: any): value is ShardingEncodeError;
/**
 * @since 1.0.0
 * @category schema
 */
export declare const ShardingEncodeErrorSchema: Schema.Schema<Schema.From<typeof ShardingEncodeErrorSchema_>, ShardingEncodeError>;
export {};
//# sourceMappingURL=ShardingEncodeError.d.ts.map