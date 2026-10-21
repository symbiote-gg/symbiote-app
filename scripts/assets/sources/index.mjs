import { mergeFacts } from "../facts.mjs";
import * as heroesData2 from "./heroes-data2.mjs";
import * as heroesData from "./heroes-data.mjs";

const SOURCES = {
    "HeroesToolChest/heroes-data": heroesData,
    "HeroesToolChest/heroes-data2": heroesData2,
};

export async function loadFacts(pins) {
    const versions = await Promise.all(
        pins.map((pin) => {
            const source = SOURCES[pin.repo];
            if (!source) throw new Error(`no source for ${pin.repo}`);
            return source.load(pin);
        }),
    );

    return mergeFacts(versions);
}
