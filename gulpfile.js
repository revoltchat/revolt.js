import { task, src } from 'gulp';
import typedoc from 'gulp-typedoc';

task("typedoc", () =>
	src(["src/**/*.ts"])
		.pipe(typedoc({
			out: "./docs",
            
			name: "revolt.js",
			readme: "README.md",
			version: true,
		}))
);
