import * as PodsHttp from "@effect/cluster-node/PodsHttp"
import * as ShardManagerClientHttp from "@effect/cluster-node/ShardManagerClientHttp"
import * as StorageFile from "@effect/cluster-node/StorageFile"
import * as Serialization from "@effect/cluster/Serialization"
import * as Sharding from "@effect/cluster/Sharding"
import * as ShardingConfig from "@effect/cluster/ShardingConfig"
import * as ShardingImpl from "@effect/cluster/ShardingImpl"
import * as NodeClient from "@effect/platform-node/Http/NodeClient"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import { CounterEntity, GetCurrent } from "./sample-common"

const liveSharding = pipe(
  ShardingImpl.live,
  Layer.use(StorageFile.storageFile),
  Layer.use(PodsHttp.httpPods),
  Layer.use(ShardManagerClientHttp.shardManagerClientHttp),
  Layer.use(ShardingConfig.withDefaults({ shardingPort: 54322 })),
  Layer.use(Serialization.json),
  Layer.use(NodeClient.layer)
)

const program = pipe(
  Effect.Do,
  Effect.bind("messenger", () => Sharding.messenger(CounterEntity)),
  Effect.tap((_) => _.messenger.sendDiscard("entity1")({ _tag: "Increment" })),
  Effect.tap((_) => _.messenger.sendDiscard("entity1")({ _tag: "Increment" })),
  Effect.bind("msg", () => GetCurrent.makeEffect({ _tag: "GetCurrent" })),
  Effect.flatMap((_) => _.messenger.send("entity1")(_.msg)),
  Effect.tap((_) => Effect.log("Current count is " + _)),
  Effect.zipRight(Effect.never),
  Effect.scoped,
  Effect.catchAllCause(Effect.logError),
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.provide(liveSharding)
)

Effect.runFork(program)
