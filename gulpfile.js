'use strict';

// Documentation on what goes into PolymerProject.
const path = require('path');
const gulp = require('gulp');
const mergeSteam = require('merge-stream');
const del = require('del');

// polymer.json
const polymerJsonPath = path.join(process.cwd(), 'polymer.json');
const polymerJSON = require(polymerJsonPath);

// polymer
const polymer = require('polymer-build');
const polymerProject = new polymer.PolymerProject(polymerJSON);

// Folders
const buildDirectory = 'build/bundled';

/**
 * Waits for the given ReadableStream
 */
function waitFor(stream) {
    return new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
    });
}

function build() {
    return new Promise((resolve, reject) => {
        // Okay, so first thing we do is clear the build
        console.log(`Deleting build/ directory...`);
        del([buildDirectory])
            .then(_ => {
                // Okay, now lets get your source files
                let sourcesStream = polymerProject.sources()
                    // Split html
                    .pipe(polymerProject.splitHtml())
                    .pipe(polymerProject.rejoinHtml());

                // Okay, now lets do the same to your dependencies
                let depsStream = polymerProject.dependencies()
                    // Split html
                    .pipe(polymerProject.splitHtml())
                    .pipe(polymerProject.rejoinHtml());

                // Okay, now lets merge them into a single build stream.
                let buildStream = mergeSteam(sourcesStream, depsStream)
                    .once('data', () => {
                        console.log('Analyzing build dependencies...');
                    });

                buildStream = buildStream.pipe(polymerProject.bundler);

                // Okay, time to pipe to the build directory
                buildStream = buildStream.pipe(gulp.dest(buildDirectory));

                // waitFor the buildStream to complete
                return waitFor(buildStream)
            })
            .then(_ => {
                // You did it!
                console.log('Build complete');
                resolve();
            });
    });
}

gulp.task('default', build);
