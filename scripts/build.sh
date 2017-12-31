#!/bin/bash

set -e

cp ./README.md ./packages/pinus/README.md
npm run authors

lerna run build

