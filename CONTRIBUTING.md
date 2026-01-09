# Contributing to Vörsight

Thank you for your interest in contributing to Vörsight! We welcome contributions from the community.

## License Agreement

By contributing to this project, you agree to license your contributions under the same [PolyForm Noncommercial 1.0.0](LICENSE) license as the project.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Your environment (OS, .NET version, Node.js version, etc.)
- Relevant logs or screenshots

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- The problem it solves or use case it addresses
- Any implementation ideas you have

### Submitting Pull Requests

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** with clear, descriptive commits
3. **Test your changes** thoroughly
4. **Update documentation** if needed (README, comments, etc.)
5. **Submit a pull request** with a clear description of your changes

#### PR Guidelines

- Keep changes focused - one feature or fix per PR
- Follow existing code style and conventions
- Add comments for complex logic
- Update tests if applicable
- Ensure CI/CD workflows pass

### Project Structure

```
vorsight/
├── dotnet/                 # C# Services & Agent
│   ├── Vorsight.Agent/     # Windows Service Agent
│   ├── Vorsight.Service/   # Service logic
│   └── ...
├── node/                   # JavaScript stack
│   ├── server/             # Node.js API server
│   └── client/             # React web dashboard
├── deploy/
│   ├── windows/                # Windows installer (Inno Setup)
│   └── linux/                  # Linux deployment scripts
└── .github/workflows/          # CI/CD (GitHub Actions)
```

### Tech Stack

- **Windows Components**: C# (.NET 10), Windows API, Named Pipes IPC
- **Server**: Node.js, Express, Prisma, SQLite, Socket.io
- **Web UI**: React, TypeScript, Vite, Recharts
- **CI/CD**: GitHub Actions, CalVer versioning

## Code Style

- **C#**: Follow standard .NET conventions, use async/await for I/O operations
- **TypeScript**: Use prettier formatting, prefer functional components (React)
- **Naming**: Clear, descriptive names; avoid abbreviations unless well-known

## Testing

Before submitting:
- **Windows Components**: Test service installation, agent interaction, screenshot capture
- **Server**: Test API endpoints, WebSocket connections, database operations
- **Web UI**: Test in browser, verify responsive design

## Questions?

Feel free to open an issue for questions or discussion about contributing!

## Code of Conduct

Be respectful, constructive, and professional. We're all here to make this project better.

---

Thank you for contributing to Vörsight! 🎉
