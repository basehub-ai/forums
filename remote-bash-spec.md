# remote-bash Spec

A CLI tool that executes bash commands against any public GitHub repository without cloning it.


```bash
# Target the default branch
npx remote-bash vercel/next.js -- grep "export default"

# Target a specific branch or commit
npx remote-bash vercel/next.js --ref main -- grep "export default"

# Target a specific version/tag
npx remote-bash vercel/next.js -v 1.0.0 -- grep "export default"

# Search for exports in Next.js default branch
npx remote-bash vercel/next.js -- grep "export default"

# Search in a specific branch
npx remote-bash vercel/next.js -r develop -- find . -name "*.ts"

# Search in a specific version tag
npx remote-bash vercel/next.js --version 13.0.0 -- ls -la src/
```
