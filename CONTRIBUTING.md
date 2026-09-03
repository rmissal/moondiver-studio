# Contributing to Moondiver Studio

First off, thank you for considering contributing to Moondiver Studio! It's people like you that make Moondiver Studio such a great tool for the community.

## 1. Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](https://github.com/rmissal/moondiver-studio/issues) page to see if someone else has already created a ticket. If not, go ahead and make one!

## 2. Setting up your environment

1. Fork the repo and clone it locally.
2. Run
   ode setup.js to install Node.js dependencies, Python, PyTorch, and Demucs.
3. Ensure you have downloaded the static FFmpeg binaries and placed them in fmpeg/bin/.
4. Run
   pm run ui to start the local development server on http://localhost:3000.

## 3. Making Changes

- Ensure your code follows the existing style (we use ESLint and Prettier). Run
  pm run lint before committing.
- Write tests for your new features or bug fixes.
- Ensure all tests pass by running
  pm test.

## 4. Submitting a Pull Request

1. Create a new branch: git checkout -b my-feature-branch
2. Make your changes and commit them with clear, descriptive commit messages.
3. Push to your fork and submit a Pull Request to the main branch.
4. The CI pipeline will automatically run tests against your PR.
