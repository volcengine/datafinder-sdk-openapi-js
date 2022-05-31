#!/bin/sh

rm -rf release/nodejssdk*
mkdir release/nodejssdk

cp -rf LICENSE release/nodejssdk/
cp -rf README.md release/nodejssdk/
cp -rf client.js release/nodejssdk/
cp -rf dsl.js release/nodejssdk/
cp -rf index.js release/nodejssdk/
cp -rf package.json release/nodejssdk/

cd release
zip -r nodejssdk.zip nodejssdk/*

rm -rf nodejssdk

cd ../
