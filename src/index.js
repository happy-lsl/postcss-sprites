import postcss from "postcss";
import path from "path";
import fs from "fs";
import _ from "lodash";
import {
    defaults,
    prepareFilterBy,
    prepareGroupBy,
    extractImages,
    applyFilterBy,
    applyGroupBy,
    setTokens,
    runSpritesmith,
    saveSpritesheets,
    mapSpritesheetProps,
    updateReferences,
    createLogger,
} from "./core";
const CONFIG_FILENAME = "postcss-sprites.config.js";
const ERROR_CONFIG_FILE_LOADING = "Error loading the config file";
const FILE_PATH = path.resolve(process.cwd(), CONFIG_FILENAME);

const loadConfigFile = () => {
    let options = {};
    try {
        fs.watch(FILE_PATH, (event, filename) => {
            if (filename && event === "change") {
                delete require.cache[require.resolve(FILE_PATH)];
            }
        });

        options = require(FILE_PATH);
    } catch (e) {
        throw new Error(ERROR_CONFIG_FILE_LOADING + e.message);
    }
    return options;
};

/**
 * Plugin registration.
 */
export default postcss.plugin("postcss-sprites", (options = {}) => {
    return (css, result) => {
        // Extend defaults

        const opts = _.merge({}, defaults, options, loadConfigFile());
        // console.log(opts);
        // Setup the logger
        opts.logger = createLogger(opts.verbose);

        // Prepare filter & group functions
        prepareFilterBy(opts, result);
        prepareGroupBy(opts);

        // Process it
        return extractImages(css, opts, result)
            .spread((opts, images) => applyFilterBy(opts, images))
            .spread((opts, images) => applyGroupBy(opts, images))
            .spread((opts, images) => setTokens(css, opts, images))
            .spread((root, opts, images) => runSpritesmith(opts, images))
            .spread((opts, images, spritesheets) =>
                saveSpritesheets(opts, images, spritesheets)
            )
            .spread((opts, images, spritesheets) =>
                mapSpritesheetProps(opts, images, spritesheets)
            )
            .spread((opts, images, spritesheets) =>
                updateReferences(css, opts, images, spritesheets)
            )
            .spread((root, opts, images, spritesheets) => {
                opts.logger(
                    `${spritesheets.length} ${
						spritesheets.length > 1 ? "spritesheets" : "spritesheet"
					} generated.`
                );
            })
            .catch((err) => {
                console.error(
                    `postcss-sprites: An error occurred while processing files - ${err.message}`
                );
                console.error(err.stack);
                throw err;
            });
    };
});