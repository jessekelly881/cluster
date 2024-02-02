import * as Activity from "@effect/cluster-workflow/Activity"
import * as DurableExecutionJournalMssql from "@effect/cluster-workflow/DurableExecutionJournalMssql"
import * as Workflow from "@effect/cluster-workflow/Workflow"
import * as WorkflowRunner from "@effect/cluster-workflow/WorkflowRunner"
import { runMain } from "@effect/platform-node/Runtime"
import * as Schema from "@effect/schema/Schema"
import * as Mssql from "@sqlfx/mssql"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Secret from "effect/Secret"

class TemporaryFailure extends Schema.TaggedClass<TemporaryFailure>()("TemporaryFailure", {}) {
}

const getAmountDue = (orderId: string) =>
  Activity.make("get-amount-due-" + orderId, Schema.never, Schema.number)(pipe(
    Effect.sync(() => Math.round(Math.random() * 100) / 100)
  ))

const processPayment = (billingId: string, amountDue: number) =>
  Activity.make("process-payment-" + billingId, Schema.never, Schema.void)(pipe(
    Effect.flatMap(
      Activity.currentAttempt,
      (currentAttempt) =>
        currentAttempt === 0 ? Effect.die(new TemporaryFailure()) : pipe(
          Effect.logDebug("Processed payment of " + amountDue + " to " + billingId + "...")
        )
    )
  ))

class BeginPaymentWorkflowRequest extends Schema.TaggedRequest<BeginPaymentWorkflowRequest>()(
  "BeginPaymentWorkflowRequest",
  Schema.never,
  Schema.void,
  {
    requestId: Schema.string,
    orderId: Schema.string,
    billingId: Schema.string
  }
) {
}

const paymentWorkflow = Workflow.make(
  BeginPaymentWorkflowRequest,
  (_) => _.requestId,
  ({ billingId, orderId }) =>
    Effect.gen(function*(_) {
      const amount = yield* _(getAmountDue(orderId))
      yield* _(processPayment(billingId, amount))
    })
)

const main = pipe(
  WorkflowRunner.resume(paymentWorkflow)(
    new BeginPaymentWorkflowRequest({ requestId: "1", orderId: "order-1", billingId: "my-card" })
  ),
  Effect.provide(DurableExecutionJournalMssql.durableExecutionJournalMssql),
  Effect.provide(Mssql.makeLayer({
    server: Config.succeed("localhost"),
    username: Config.succeed("sa"),
    password: Config.succeed(Secret.fromString("Zuffellat0")),
    database: Config.succeed("cluster")
  })),
  Logger.withMinimumLogLevel(LogLevel.All)
)

runMain(main)