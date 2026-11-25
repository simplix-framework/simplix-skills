# Entities, services, controllers, responses and errors

Framework pages: `simplix:docs/en/building-a-crud-api.md`, `simplix:spring-boot-starter-simplix/docs/en/writing-services-and-controllers.md`, `simplix:spring-boot-starter-simplix/docs/en/handling-errors.md`, `simplix:simplix-core/docs/en/api-responses-and-errors.md`, `simplix:simplix-core/docs/en/entities-and-repositories.md`, `simplix:simplix-core/docs/en/validating-input.md`, `simplix:simplix-core/docs/en/error-code-reference.md`.

## What is written by hand and what is generated

| Piece | Written by |
| --- | --- |
| The entity and its repository | You |
| The service, the REST controller, the DTOs and the service test of the entity | The generator, from the entity yml |
| An endpoint that is not the CRUD of one entity | You, on the same base classes |

## Entity and repository

```java
import dev.simplecore.simplix.core.annotation.NameField;
import dev.simplecore.simplix.core.entity.SimpliXBaseEntity;
import dev.simplecore.simplix.core.repository.SimpliXBaseRepository;

@Entity
@Table(name = "authors")
public class Author extends SimpliXBaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "author_id", nullable = false, updatable = false)
    private String authorId;

    @Column(name = "pen_name", nullable = false, length = 120)
    @NameField
    private String penName;

    @Override
    public String getId() {
        return authorId;
    }

    @Override
    public void setId(String id) {
        this.authorId = id;
    }
}

public interface AuthorRepository extends SimpliXBaseRepository<Author, String> {
}
```

- `@NameField` marks the field a record is named by on a screen: the first column of its list, the name in a delete confirmation, the title of its detail.
- The generator reads column lengths, nullability and comments from the entity, so state them on the entity rather than only in a DTO.
- The generator expects the repository in a `repository` package beside the `entity` package of the entity unless the project configures it to generate repositories.

## The endpoints a generated controller serves

The request path comes from `thymeleafBaseDir` of the entity yml, after any prefix the application gives its REST controllers.

| Request | Does | Permission action |
| --- | --- | --- |
| `POST <path>/create` | creates a record | `create` |
| `GET <path>/{id}` | reads one record | `view` |
| `GET <path>/{id}/edit` | reads one record in the shape of the update form | `view` |
| `PUT <path>/{id}` | updates a record | `edit` |
| `PATCH <path>` | updates several records, each with its own values | `edit` |
| `PATCH <path>/batch` | sets the same values on several records | `edit` |
| `DELETE <path>/{id}` | deletes a record | `delete` |
| `DELETE <path>/batch` | deletes several records | `delete` |
| `GET <path>/search` | searches with query parameters | `list` |
| `POST <path>/search` | searches with a condition in the body | `list` |

## A controller written by hand

```java
import dev.simplecore.simplix.core.model.SimpliXApiResponse;
import dev.simplecore.simplix.web.controller.SimpliXStandardApi;

@RestController
@RequestMapping("/catalog/statistics")
@SimpliXStandardApi
public class CatalogStatisticsController {

    @GetMapping("/author-count")
    @PreAuthorize("hasPermission('CATALOG', 'list')")
    public SimpliXApiResponse<Long> authorCount() {
        return SimpliXApiResponse.success(authorRepository.count());
    }
}
```

- Return a `SimpliXApiResponse`, guard the method with the same permission check as the generated ones, and add `@SimpliXStandardApi` so the standard responses are described in the API document.
- `SimpliXBaseController` keeps the service in the protected field `service` and already carries `@SimpliXStandardApi`.
- `SimpliXBaseService` takes the repository and the `EntityManager`. It reads by id, by ids and by page, as entities or as projections, saves, deletes, and runs a search with `findAllWithSearch`. Use those methods before writing a query of your own.
- `@SimpliXDefaultSort` and `@SimpliXListFigures` on a controller describe the default order and the figures of a list for clients. A field named there has to be sortable or declared in the search DTO of the entity.

## The response

`SimpliXApiResponse` has a `type` of `SUCCESS`, `FAILURE` or `ERROR`, and carries `body`, `message`, `timestamp`, `errorCode` and `errorDetail`. A field without a value is left out of the JSON.

- `SimpliXApiResponse.success(body)` answers with data. A success response keeps no message: put a text the client has to show into the body.
- `SimpliXApiResponse.failure(data, message)` answers a request that was understood and could not be fulfilled, and that the client is expected to handle.
- An application seldom builds an error response. It throws, and the handler builds it.

## Errors

```java
import dev.simplecore.simplix.core.exception.ErrorCode;
import dev.simplecore.simplix.core.exception.SimpliXGeneralException;

throw new SimpliXGeneralException(ErrorCode.GEN_NOT_FOUND, "Author not found", Map.of("authorId", authorId));
```

- The `ErrorCode` decides the HTTP status, so a service decides the status without touching the web layer.
- The prefix of a code is its category: `GEN_`, `AUTH_`, `AUTHZ_`, `VAL_`, `SEARCH_`, `BIZ_`, `DB_`, `EXT_`. The codes are fixed. For a rule of the application, throw a `BIZ_` code and put the application's own reason into the detail.
- `SimpliXExceptionHandler` answers every exception that leaves a controller. `simplix:spring-boot-starter-simplix/docs/en/handling-errors.md` lists which exception becomes which status and code.
- An `IllegalStateException` is answered as a conflict, and any exception the table does not name as an internal server error. Neither sends its message to the client.
- A request body that fails validation is answered with one `ValidationFieldError` per field: the field, the message in the language of the request, the rejected value and the constraint.

## Validation

Declare Bean Validation constraints on the request class and take it as `@RequestBody @Validated`. The validators the framework adds, such as the unique checks `@UniqueField` and `@UniqueFields`, are in `simplix:simplix-core/docs/en/validating-input.md`.
