import * as Schema from "@effect/schema/Schema"
import * as Data from "effect/Data"
import { pipe } from "effect/Function"
import * as List from "effect/List"
import * as Option from "effect/Option"
import * as Pod from "../Pod.js"

/** @internal */
const PodWithMetadataSymbolKey = "@effect/cluster/PodWithMetadata"

/** @internal */
export const PodWithMetadataTypeId = Symbol.for(PodWithMetadataSymbolKey)

/** @internal */
export type PodWithMetadataTypeId = typeof PodWithMetadataTypeId

/** @internal */
export interface PodWithMetadata extends
  Data.Data<{
    [PodWithMetadataTypeId]: PodWithMetadataTypeId
    pod: Pod.Pod
    registered: number
  }>
{}

/** @internal */
export function make(pod: Pod.Pod, registered: number): PodWithMetadata {
  return Data.struct({ [PodWithMetadataTypeId]: PodWithMetadataTypeId, pod, registered })
}

/** @internal */
export function isPodWithMetadata(value: unknown): value is PodWithMetadata {
  return (
    typeof value === "object" &&
    value !== null &&
    PodWithMetadataTypeId in value &&
    value[PodWithMetadataTypeId] === PodWithMetadataTypeId
  )
}

/** @internal */
export function extractVersion(pod: PodWithMetadata): List.List<number> {
  return pipe(
    List.fromIterable(pod.pod.version.split(".")),
    List.map((_) => parseInt(_, 10))
  )
}

/** @internal */
export function compareVersion(a: List.List<number>, b: List.List<number>): 0 | 1 | -1 {
  let restA = a
  let restB = b
  while (List.size(restA) > 0 || List.size(restB) > 0) {
    const numA = pipe(
      List.head(restA),
      Option.getOrElse(() => 0)
    )
    const numB = pipe(
      List.head(restB),
      Option.getOrElse(() => 0)
    )

    if (numA < numB) return -1
    if (numB > numA) return 1
    restA = pipe(
      List.tail(restA),
      Option.getOrElse(() => List.empty())
    )
    restB = pipe(
      List.tail(restB),
      Option.getOrElse(() => List.empty())
    )
  }
  return 0
}

/** @internal */
export const schema: Schema.Schema<
  {
    readonly "@effect/cluster/PodWithMetadata": "@effect/cluster/PodWithMetadata"
    readonly pod: {
      readonly "@effect/cluster/Pod": "@effect/cluster/Pod"
      readonly address: {
        readonly "@effect/cluster/PodAddress": "@effect/cluster/PodAddress"
        readonly host: string
        readonly port: number
      }
      readonly version: string
    }
    readonly registered: number
  },
  PodWithMetadata
> = Schema.data(Schema.rename(
  Schema.struct({
    [PodWithMetadataSymbolKey]: Schema.compose(
      Schema.compose(Schema.literal(PodWithMetadataSymbolKey), Schema.symbol),
      Schema.uniqueSymbol(PodWithMetadataTypeId)
    ),
    pod: Pod.schema,
    registered: Schema.number
  }),
  { [PodWithMetadataSymbolKey]: PodWithMetadataTypeId }
))