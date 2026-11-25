# Setting up a SimpliX application

Framework pages: `simplix:docs/en/getting-started.md`, `simplix:docs/en/release-lines.md`, `simplix:spring-boot-starter-simplix/docs/en/getting-started.md`, `simplix:spring-boot-starter-simplix/docs/en/configuration-reference.md`.

## Dependencies

- The modules are published to GitHub Packages under the group `dev.simplecore.simplix`. The build needs a token that may read packages; keep it in a file the repository ignores or in the environment.
- `spring-boot-starter-simplix` brings `simplix-core`, `simplix-auth`, `simplix-cache`, `simplix-egov`, `simplix-email`, `simplix-encryption`, `simplix-excel`, `simplix-file`, `simplix-hibernate`, `simplix-messaging`, `simplix-mybatis` and `simplix-scheduler`.
- `simplix-stream`, `simplix-sync` and `simplix-license` are not part of the starter. Add each as its own dependency when it is needed.
- The starter brings Searchable JPA and the eGovFrame runtime, which are served from repositories of their own. The getting started page lists the repositories a build declares.
- A Maven project inherits `spring-boot-starter-parent`. Without the parent Maven cannot collect the versions of the transitive dependencies.

## The application class

```java
import dev.simplecore.simplix.core.tree.factory.SimpliXRepositoryFactoryBean;

@SpringBootApplication
@EnableJpaRepositories(
    basePackages = "com.example.library.domain",
    repositoryFactoryBeanClass = SimpliXRepositoryFactoryBean.class
)
public class LibraryApplication {
}
```

A repository that extends `SimpliXTreeRepository` needs this factory, and plain repositories work with it too, so it is set once for the application.

## First configuration

```yaml
simplix:
  auth:
    jwe:
      encryption-key-location: classpath:keys/jwe-key.json
  date-time:
    default-timezone: Asia/Seoul
    use-utc-for-database: true
```

- `simplix-auth` is part of the starter and reads the token key when the application starts, so an application on the starter needs the key file even before it has a login.
- Every setting of the framework starts with `simplix`. Each module lists its settings with defaults in its own `configuration-reference.md`.
- Spring Boot settings keep their meaning. Turn `spring.jpa.open-in-view` off: a response is built from DTOs, not from lazily loaded entities.

## When the application does not start

Read the troubleshooting page of the module the stack trace names before changing code: `simplix:spring-boot-starter-simplix/docs/en/troubleshooting.md` for the starter, `simplix:simplix-auth/docs/en/troubleshooting.md` for the key and the security configuration, and the same file under each other module. They are ordered by the message a failed start prints.
