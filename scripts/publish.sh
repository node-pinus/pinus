echo ">>>>>> copy readme to pinus/readme"
source `dirname $0`/build.sh
git add .
lerna publish $*
