/**
 * @since 1.0.0
 */
import type * as DurableExecutionEvent from "@effect/cluster-workflow/DurableExecutionEvent"
import * as DurableExecutionJournal from "@effect/cluster-workflow/DurableExecutionJournal"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"

class JournalEntry extends Data.Class<{
  persistenceId: string
  event: DurableExecutionEvent.DurableExecutionEvent<any, any>
}> {
}

/**
 * @since 1.0.0
 */
export const activityJournalInMemory = Layer.effect(
  DurableExecutionJournal.DurableExecutionJournal,
  Effect.gen(function*(_) {
    const memory = yield* _(Ref.make<Array<JournalEntry>>([]))
    return ({
      append: (persistenceId, _, __, event) =>
        pipe(
          Ref.update(memory, (_) => _.concat([new JournalEntry({ persistenceId, event })]))
        ),
      read: (persistenceId) =>
        pipe(
          Ref.get(memory),
          Effect.map(Stream.fromIterable),
          Stream.unwrap,
          Stream.filter((_) => _.persistenceId === persistenceId),
          Stream.map((_) => _.event)
        )
    })
  })
)
