# Declaring search fields

Framework pages: `searchable-jpa:docs/en/search-fields.md`, `searchable-jpa:docs/en/relationship-and-two-phase-query.md`, `searchable-jpa:docs/en/basic-usage.md`.

## The pieces of one search endpoint

```java
import static dev.simplecore.searchable.core.condition.operator.SearchOperator.CONTAINS;
import static dev.simplecore.searchable.core.condition.operator.SearchOperator.EQUALS;
import static dev.simplecore.searchable.core.condition.operator.SearchOperator.IN;

import dev.simplecore.searchable.core.annotation.SearchableField;
import dev.simplecore.searchable.core.annotation.SearchableParams;
import dev.simplecore.searchable.core.condition.SearchCondition;
import dev.simplecore.searchable.core.service.DefaultSearchableService;

public class PostSearchDTO {

    @SearchableField(operators = {EQUALS, IN}, sortable = true)
    private Long id;

    @SearchableField(operators = {EQUALS, CONTAINS}, sortable = true, keyword = true)
    private String title;
}

public interface PostRepository extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {
}

@Service
public class PostService extends DefaultSearchableService<Post, Long> {

    public PostService(PostRepository repository, EntityManager entityManager) {
        super(repository, entityManager);
    }
}

@GetMapping
public Page<PostResponse> list(@SearchableParams SearchCondition<PostSearchDTO> condition) {
    return service.findAllWithSearch(condition).map(PostResponse::from);
}
```

- The repository extends both `JpaRepository` and `JpaSpecificationExecutor`.
- A service that already extends another class implements `SearchableServiceSupport` and returns a `SearchableServiceDelegate` from `getSearchableDelegate()`. Both ways run the same code.
- The starter resolves a `@SearchableParams SearchCondition<D>` parameter from the query string. A JSON body is taken as `@RequestBody SearchCondition<D>`.
- Only the field declarations of the DTO are read. A class with fields only, a record and a class that inherits fields all work, and no accessors are needed.

## Attributes of `@SearchableField`

Every attribute is optional.

| Attribute | Default | Effect |
| --- | --- | --- |
| `operators` | empty | Only the listed operators are accepted. Empty accepts every operator |
| `sortable` | `false` | The field may appear in `sort` |
| `entityField` | the DTO field name | The entity path that is searched, such as `author.name` |
| `sortField` | `entityField` | The entity path that is sorted by |
| `keyword` | `false` | The reserved `keyword` parameter searches the field |
| `caseSensitivity` | `DEFAULT` | How case is treated for the field |
| `match` | `JOINED` | How conditions on a path through a collection are matched |
| `aggregatable` | `false` | An aggregate addressed by the DTO field is allowed |

A client names DTO fields only. It cannot name an entity path, and an entity path or a fetch path it sends is not used.

## Decisions

- Keyword search: a keyword field is a `String` whose `operators` allow `CONTAINS`. A row matches when any keyword field contains the text, and that result is combined with the other conditions by AND. A DTO without a keyword field refuses the `keyword` parameter.
- Case: `CaseSensitivity.INSENSITIVE` makes the pattern operators and `EQUALS`, `NOT_EQUALS`, `IN`, `NOT_IN` ignore case for that field. `CaseSensitivity.SENSITIVE` keeps the comparison of the database even when `searchable.pattern-matching.case-insensitive` is on.
- Presence of a value: allow `IS_NULL` or `IS_NOT_NULL` on the field.
- Limits on search values: a Bean Validation constraint on a DTO field applies to every value searched on it, to the text of a pattern operator and to both bounds of a range. A minimum length is the way to refuse one-character searches over a whole table. Constraints of fields a request does not search are not checked.
- Sort order: the primary key is added after the orders the client sent, so rows with equal sort values keep one order.

## Fields behind a collection

`entityField` may run through a to-many association or name a collection of values. When several conditions reach into the same collection, `match` decides whether one element has to satisfy them together.

| `match` | A row matches when |
| --- | --- |
| `CollectionMatch.JOINED` | One element satisfies every `JOINED` condition on that collection |
| `CollectionMatch.ANY` | Some element satisfies this condition, whatever the other conditions matched |
| `CollectionMatch.NONE` | No element satisfies this condition. A row without elements matches |

- A page and its total count root entities. A row counts once however many elements of a collection match.
- A condition decides which rows match and a fetch decides what is loaded with them. Fetch paths are named by server code only.
