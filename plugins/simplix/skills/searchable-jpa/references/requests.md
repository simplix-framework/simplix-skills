# Writing requests

Framework pages: `searchable-jpa:docs/en/request-formats.md`, `searchable-jpa:docs/en/search-operators.md`.

## Three forms, one condition

Each form becomes a `SearchCondition<D>` and passes the same validation.

| Form | Use it for | What it can express |
| --- | --- | --- |
| GET parameters | Filters of a list screen, a search shared as a link | Conditions combined by AND |
| JSON body | A search that needs OR or nested groups | Every condition |
| `SearchConditionBuilder` | A search composed by server code | Every condition |

```text
GET /api/posts?title.contains=Spring&status.in=PUBLISHED,ARCHIVED&sort=createdAt.desc,id.asc&page=0&size=20
```

```json
{
  "conditions": [
    {"field": "status", "searchOperator": "equals", "value": "PUBLISHED"},
    {"operator": "and", "conditions": [
      {"field": "title", "searchOperator": "contains", "value": "Spring"},
      {"operator": "or", "field": "title", "searchOperator": "contains", "value": "JPA"}
    ]}
  ],
  "sort": {"orders": [{"field": "createdAt", "direction": "desc"}]},
  "page": 0,
  "size": 20
}
```

```java
SearchCondition<PostSearchDTO> condition = SearchConditionBuilder.create(PostSearchDTO.class)
        .where(w -> w.equals("status", PostStatus.PUBLISHED))
        .and(g -> g.contains("title", "Spring").orContains("title", "JPA"))
        .sort(s -> s.desc("createdAt").asc("id"))
        .page(0).size(20)
        .build();
```

## GET parameters

- A condition parameter is named `field.operator`. The field is a DTO field name.
- Reserved parameters: `sort` (`field.direction` entries separated by commas), `page` (starting at 0), `size` and `keyword`.
- A comma separates values only for `in`, `notIn`, `between` and `notBetween`. A value of `in` that contains a comma needs the array of a JSON body.
- A query parameter that is not a search parameter is refused. `searchable.params.ignore-unknown` leaves such parameters out instead. An endpoint that takes other parameters beside the search parameters removes them before parsing, or takes the parameters as a map and converts them with `SearchableParamsParser`.

## JSON body

- The `operator` of an entry (`and` or `or`) says how that entry combines with the whole result before it. The first entry of a list needs none.
- `in` and `notIn` take an array in `value`. `between` and `notBetween` take `value` and `value2`. `isNull` and `isNotNull` take no value.
- Server code that handles the JSON text itself uses `SearchCondition.fromJson(json, type)`, which runs the DTO validation as well.

## Builder

- `where` starts the first condition, and `and` and `or` combine groups.
- Inside a group, operator methods written one after another are combined by AND. The methods that start with `or`, such as `orContains` and `orIn`, combine by OR.
- `SearchConditionBuilder.from(condition, type)` copies a condition of the client before extending it. Add a mandatory condition with AND after the whole expression of the client: adding it with OR widens the result. For access control use a server scope instead.

## Operators

The name is the same in a GET parameter, in `searchOperator` of a JSON body and as a builder method.

| Kind | Names |
| --- | --- |
| Equality | `equals`, `notEquals` |
| Order | `greaterThan`, `greaterThanOrEqualTo`, `lessThan`, `lessThanOrEqualTo` |
| Text pattern | `contains`, `notContains`, `startsWith`, `notStartsWith`, `endsWith`, `notEndsWith` |
| Presence | `isNull`, `isNotNull` |
| Listed values | `in`, `notIn` |
| Range | `between`, `notBetween` (both bounds included) |

## Values

- A value is converted to the type of the DTO field before it is compared. Text for a `String` field is searched as sent, neither trimmed nor normalized.
- A boolean accepts `true/false`, `1/0`, `yes/no`, `y/n` and `on/off`. An enum takes the name of a constant.
- A date the calendar does not have is refused. A value without an offset is read in the time zone of the application, which `searchable.date-time.default-timezone` can set.
- A `between` written with dates only starts at midnight of the first date and covers the whole of the last date.
- Use the order and range operators only on types that have an order. For enums and UUIDs the fitting operators are `equals`, `in` and the presence checks.
