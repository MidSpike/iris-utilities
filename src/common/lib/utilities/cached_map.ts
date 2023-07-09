//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

export interface CachedMapData<Data> {
    expiration_epoch: number;
    data: Data;
}

export class CachedMap<
    K extends string,
    V extends CachedMapData<unknown>,
> extends Map<K, V> {
    async ensure(
        key: K,
        generator: (key: K, cached_map: this) => Promise<V>,
    ): Promise<V> {
        const item_from_cache = this.get(key);
        if (
            item_from_cache &&
            item_from_cache.expiration_epoch > Date.now()
        ) {
            return item_from_cache;
        }

        const generated_item: V = await generator(key, this);
        this.set(key, generated_item);

        return generated_item;
    }
}
