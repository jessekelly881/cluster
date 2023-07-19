/**
 * @since 1.0.0
 */
import * as Data from "@effect/data/Data";
import { pipe } from "@effect/data/Function";
import * as Schema from "@effect/schema/Schema";
import * as Replier from "@effect/shardcake/Replier";
/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = /*#__PURE__*/Symbol.for("@effect/shardcake/Message");
/** @internal */
export function isMessage(value) {
  return typeof value === "object" && value !== null && "replier" in value && Replier.isReplier(value.replier);
}
/**
 * Creates both the schema and a constructor for a `Message<A>`
 *
 * @since 1.0.0
 * @category schema
 */
export function schema(success) {
  return function (item) {
    const result = pipe(item, Schema.extend(Schema.struct({
      replier: Replier.schema(success)
    })));
    const make = arg => replyId => Data.struct({
      ...arg,
      replier: Replier.replier(replyId, success)
    });
    return [result, make];
  };
}
//# sourceMappingURL=Message.mjs.map