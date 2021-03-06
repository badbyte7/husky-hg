'use strict'

const normalize = require('normalize-path')
const stripIndent = require('strip-indent')
const pkg = require('../../package.json')

function platformSpecific() {
  // On OS X and Linux, try to use nvm if it's installed
  if (process.platform === 'win32') {
    // Add
    // Node standard installation path /c/Program Files/nodejs
    // for GUI apps
    // https://github.com/typicode/husky/issues/49
    return stripIndent(
      `
      # Node standard installation
      export PATH="$PATH:/c/Program Files/nodejs"`
    )
  } else {
    // Using normalize to support ' in path
    // https://github.com/typicode/husky/issues/117
    const home = normalize(process.env.HOME)

    return stripIndent(
      `
        # Add common path where Node can be found
        # Brew standard installation path /usr/local/bin
        # Node standard installation path /usr/local
        export PATH="$PATH:/usr/local/bin:/usr/local"

        # Try to load nvm using path of standard installation
        load_nvm ${home}/.nvm
        run_nvm`
    )

    return arr.join('\n')
  }
}

module.exports = function getHookScript(vcs, hookName, relativePath, npmScriptName) {
  // On Windows normalize path (i.e. convert \ to /)
  const normalizedPath = normalize(relativePath)

  const preCommitMsgHookName = vcs.name === 'git' ? 'prepare-commit-msg' : 'pretxncommit'

  const vcsHookParamsVar = vcs.name === 'git' ? 'GIT_PARAMS' : 'HG_ARGS'

  const noVerifyMessage =
    hookName === preCommitMsgHookName
      ? '(cannot be bypassed with --no-verify due to Git specs)'
      : '(add --no-verify to bypass)'

  return [
    stripIndent(
      `
      #!/bin/sh
      #husky ${pkg.version}

      command_exists () {
        command -v "$1" >/dev/null 2>&1
      }

      has_hook_script () {
        [ -f package.json ] && cat package.json | grep -q "\\"$1\\"[[:space:]]*:"
      }

      # OS X and Linux only
      load_nvm () {
        # If nvm is not loaded, load it
        command_exists nvm || {
          export NVM_DIR="$1"
          [ -s "$1/nvm.sh" ] && . "$1/nvm.sh"
        }
      }

      # OS X and Linux only
      run_nvm () {
        # If nvm has been loaded correctly, use project .nvmrc
        command_exists nvm && [ -f .nvmrc ] && nvm use
      }

      cd "${normalizedPath}"

      # Check if ${npmScriptName} script is defined, skip if not
      has_hook_script ${npmScriptName} || exit 0`
    ).trim(),

    platformSpecific(),

    stripIndent(
      `
      # Check that npm exists
      command_exists npm || {
        echo >&2 "husky > can't find npm in PATH, skipping ${npmScriptName} script in package.json"
        exit 0
      }

      # Export VCS hook params
      export ${vcsHookParamsVar}="$*"

      # Run npm script
      echo "husky > npm run -s ${npmScriptName} (node \`node -v\`)"
      echo

      npm run -s ${npmScriptName} || {
        echo
        echo "husky > ${hookName} hook failed ${noVerifyMessage}"
        exit 1
      }
      `
    )
  ].join('\n')
}
