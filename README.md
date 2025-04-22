# Menubar Timer

## Development Setup

Follow these steps to run the project in development mode:

1. **Ensure the correct Node.js version is installed**:
   Use the Node.js version specified in the `engines` field of `package.json` (`22.x`). You can use `nvm` to automatically detect and use the correct version:

   ```bash
   nvm install
   nvm use
   ```

2. **Install the correct version of pnpm**:
   The pnpm version is automatically picked up by Corepack from the `package.json`. Ensure Corepack is enabled:

   ```bash
   corepack enable
   ```

3. **Install dependencies**:
   Run the following command to install the project dependencies:

   ```bash
   pnpm install
   ```

4. **Start the project in development mode**:
   Use the following command to start the project:

   ```bash
   pnpm start
   ```
