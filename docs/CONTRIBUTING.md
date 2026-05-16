# Contributing Guidelines

## Welcome to Roadlyn!

We're excited that you're interested in contributing to Roadlyn. This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome feedback and different perspectives
- Focus on constructive criticism
- Celebrate successes and learn from failures

## How to Contribute

### 1. Fork & Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/yourusername/roadlyn.git
cd roadlyn
```

### 2. Create a Branch

```bash
# Create feature branch
git checkout -b feat/your-feature-name

# or fix branch
git checkout -b fix/issue-description
```

### 3. Make Changes

- Follow the [Development Guide](./DEVELOPMENT.md)
- Write clean, well-documented code
- Follow code style guidelines (ESLint, Prettier)
- Add type annotations (TypeScript)

### 4. Commit Changes

```bash
# Commit with conventional commit message
git commit -m "feat(scope): description"
```

### 5. Push & Create PR

```bash
# Push to your fork
git push origin feat/your-feature-name

# Create Pull Request on GitHub
```

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

**Format**:
```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build, dependencies, CI configuration

**Scopes**:
- `auth`: Authentication
- `api`: Backend API
- `web`: Frontend
- `db`: Database
- `types`: Type definitions
- `ui`: UI components
- `config`: Configuration
- `deps`: Dependencies

**Examples**:
```
feat(auth): add two-factor authentication
fix(api): handle null values in roadmap query
docs(readme): add Docker setup instructions
refactor(web): extract button component
style(api): format error handling
test(auth): add JWT verification tests
chore(deps): upgrade Node.js to 20.11
```

## Code Style Guidelines

### General

- Use TypeScript for type safety
- Avoid `any` types
- Keep functions small and focused
- Write self-documenting code
- Add comments for complex logic

### Frontend (React/Next.js)

```typescript
// ✅ Good
export interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ children, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

// ❌ Avoid
function Button(props: any) {
  return <button {...props}>{props.children}</button>;
}
```

### Backend (Node.js/Fastify)

```typescript
// ✅ Good
export async function getUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({ where: { id } });
}

// ❌ Avoid
export async function getUser(id: any) {
  return await db.user.findUnique({ where: { id } });
}
```

### Database (Prisma)

```prisma
// ✅ Good - clear relations and indexes
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())

  @@index([email])
}

// ❌ Avoid - missing indexes and relations
model User {
  id    String
  email String
}
```

## Before Submitting

### Checklist

- [ ] Code compiles without errors
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] Tests pass (if added)
- [ ] ESLint passes (`pnpm lint`)
- [ ] Code is formatted (`pnpm format`)
- [ ] Commit messages follow convention
- [ ] Documentation is updated
- [ ] No hardcoded credentials

### Running Quality Checks

```bash
# Run all checks
pnpm lint && pnpm format:check && pnpm type-check

# Or use Makefile
make lint
make format-check
make type-check
```

## Pull Request Process

### Guidelines

- Write a clear PR title and description
- Reference related issues: "Closes #123"
- Provide context and motivation
- Include screenshots for UI changes
- Keep PRs focused and reasonably sized

### PR Description Template

```markdown
## Description
Brief description of changes

## Related Issue
Closes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Tested locally
- [ ] Added tests
- [ ] No new warnings

## Breaking Changes
None / Describe breaking changes
```

### Review Process

- Code review required before merge
- CI/CD checks must pass
- Follow feedback and iterate
- Squash commits if requested
- Final approval by maintainer

## Reporting Issues

### Bug Report

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment info (OS, Node version, etc.)
- Screenshots if applicable

### Feature Request

Include:
- Clear title and description
- Use case and benefits
- Possible implementation approach
- Any concerns or tradeoffs

## Development Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for:
- Environment setup
- Running locally
- Database management
- Building and testing
- Debugging tips

## Project Structure

```
roadlyn/
├── apps/
│   ├── web/       # Frontend
│   └── api/       # Backend
├── packages/      # Shared code
├── docker/        # Docker configs
├── scripts/       # Automation
├── docs/          # Documentation
└── Makefile       # Development commands
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture.

## Testing

### Writing Tests

- Test critical paths
- Use descriptive test names
- Keep tests focused
- Mock external dependencies

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
```

## Documentation

- Update README if user-facing changes
- Add code comments for complex logic
- Update DEVELOPMENT.md for process changes
- Update ARCHITECTURE.md for design changes
- Add examples for new features

## Performance

- Avoid unnecessary re-renders (React)
- Use query optimization (Prisma)
- Implement pagination for large datasets
- Cache frequently accessed data
- Monitor bundle sizes

## Security

- Never commit secrets or API keys
- Validate and sanitize user input
- Use parameterized queries
- Keep dependencies updated
- Report security issues privately

## Getting Help

- Review existing documentation
- Check GitHub Issues and Discussions
- Ask in pull request comments
- Contact maintainers

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Acknowledged in releases
- Recognized in GitHub contributors

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue or discussion on GitHub.

---

Thank you for contributing to Roadlyn! 🎉

**Last Updated**: May 2026
