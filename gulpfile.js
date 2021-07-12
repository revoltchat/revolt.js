const { task, src } = require('gulp');
const typedoc = require('gulp-typedoc');

task("typedoc", () =>
	src(["src/**/*.ts"])
		.pipe(typedoc({
			out: "./docs",
            
			name: "revolt.js",
			readme: "README.md",
			version: true,
		}))
);