---
title: ReplyChannel.ts
nav_order: 17
parent: "@effect/cluster"
---

## ReplyChannel overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [models](#models)
  - [ReplyChannel (interface)](#replychannel-interface)
- [symbols](#symbols)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [utils](#utils)
  - [isReplyChannel](#isreplychannel)

---

# models

## ReplyChannel (interface)

**Signature**

```ts
export interface ReplyChannel<A> {
  /**
   * @since 1.0.0
   */
  readonly _id: TypeId
  /**
   * @since 1.0.0
   */
  readonly await: Effect.Effect<never, never, void>
  /**
   * @since 1.0.0
   */
  readonly fail: (
    cause: Cause.Cause<ShardingError.ShardingErrorEntityNotManagedByThisPod>
  ) => Effect.Effect<never, never, void>
  /**
   * @since 1.0.0
   */
  readonly reply: (value: A) => Effect.Effect<never, never, void>
  /**
   * @since 1.0.0
   */
  readonly output: Effect.Effect<never, ShardingError.ShardingErrorEntityNotManagedByThisPod, Option.Option<A>>
}
```

Added in v1.0.0

# symbols

## TypeId

**Signature**

```ts
export declare const TypeId: '@effect/cluster/ReplyChannel'
```

Added in v1.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v1.0.0

# utils

## isReplyChannel

**Signature**

```ts
export declare function isReplyChannel(value: unknown): value is ReplyChannel<any>
```

Added in v1.0.0