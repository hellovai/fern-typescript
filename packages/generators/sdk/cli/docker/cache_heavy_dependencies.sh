#!/usr/bin/env sh

set -e

project_name=heavy_deps_project

mkdir $project_name
cd $project_name

# this exits with a non-zero exit code because git is not installed.
# but it initializes the project correctly.
yarn init -2 || :

yarn add typescript@4.9.3
yarn add esbuild@0.16.15

cd ..
/bin/rm -rf $project_name
