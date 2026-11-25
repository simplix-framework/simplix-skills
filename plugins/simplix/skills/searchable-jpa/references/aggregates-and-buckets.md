# Aggregates and time buckets

Framework pages: `searchable-jpa:docs/en/aggregates.md`, `searchable-jpa:docs/en/time-buckets.md`.

Both read the same `SearchCondition` a list is read with, so the figures of a screen match its rows. Each method takes the entity type, the condition and a server scope, or `null` when there is none.

## Aggregates

The starter registers a `SearchAggregator` bean.

```java
List<ValueCount> perStatus = aggregator.countByValue(Post.class, condition, null, PostSearchDTO.class, "status");
List<AggregateValue> figures = aggregator.aggregate(Post.class, condition, null, PostSearchDTO.class,
        List.of(new Aggregate("viewCount", Op.SUM), new Aggregate("viewCount", Op.AVG)));
```

- Passing the DTO class addresses fields by DTO field name and allows only fields declared with `aggregatable = true`. Use that form for anything a client names.
- A count per value counts matching root entities. An enum field returns every constant in declaration order, including those with a count of 0. Other types return the values that occur, the most frequent first, up to `searchable.aggregate.max-groups`.
- The operations are `sum`, `avg`, `count`, `countDistinct`, `min` and `max`. Several figures are computed by one query and returned in the order asked.
- Invalid input raises `SearchableValidationException`.

## Time buckets

The starter registers a `TimeBucketCounter` bean.

| Method | Cut by | Returns |
| --- | --- | --- |
| `count` | Buckets of equal width between two instants | One count per bucket, in time order |
| `countByCalendar` | The hours, days, weeks, months or years of a zone | One `TimeBucket` per slice |

- The result always holds as many values as buckets were asked for, including buckets with a count of 0. `searchable.bucket.max-buckets` bounds one call.
- An endpoint that takes the window beside the search parameters removes the window parameters before parsing: `TimeWindowParams.strip(params)`, then `SearchableParamsParser`.
- A column without an offset that is written outside UTC needs the time axis settings the framework page describes.
