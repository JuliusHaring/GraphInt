#!/bin/sh
set -e

mkdir -p .git/hooks

cat > .git/hooks/commit-msg << 'EOF'
#!/bin/sh
npx --no -- commitlint --edit "$1"
EOF

chmod +x .git/hooks/commit-msg
