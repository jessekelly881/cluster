/**
 * @since 1.0.0
 */
import * as Data from "@effect/data/Data";
import * as Schema from "@effect/schema/Schema";
/**
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = "@effect/shardcake/PoisonPill";
/**
 * `PoisonPill`
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = /*#__PURE__*/Data.struct({
  _id: TypeId
});
/**
 * @since 1.0.0
 * @category utils
 */
export function isPoisonPill(value) {
  return typeof value === "object" && value !== null && "_id" in value && value["_id"] === TypeId;
}
/**
 * This is the schema for a value.
 *
 * @since 1.0.0
 * @category schema
 */
export const schema = /*#__PURE__*/Schema.data( /*#__PURE__*/Schema.struct({
  _id: /*#__PURE__*/Schema.literal(TypeId)
}));
//# sourceMappingURL=PoisonPill.mjs.map