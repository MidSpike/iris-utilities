'use strict';

const { math_clamp } = require('../utilities.js');

const { GuildConfigManipulator } = require('./GuildConfig.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for controlling and interacting with the Volume of a Guild Audio Dispatcher
 * @param {Guild} guild 
 * @returns {VolumeManager} 
 */
class VolumeManager {
    constructor(guild) {
        this._guild = guild;
        this._muted = false;
        this._volume = 50;
        this._safety_multiplier = 0.0040;
        this._last_volume = 50;
        this._fallback_volume = 50;
        this._fallback_guild_volume_multiplier = 0.0040;
        this._fallback_guild_volume_maximum = 100;
    }
    get muted() {
        return this._muted;
    }
    get volume() {
        return this._volume;
    }
    get last_volume() {
        return this._last_volume;
    }
    get multiplier() {
        const guild_volume_multiplier = new GuildConfigManipulator(this._guild.id).config.volume_multiplier ?? this._fallback_guild_volume_multiplier;
        return guild_volume_multiplier * this._safety_multiplier;
    }
    get maximum() {
        const guild_volume_maximum = new GuildConfigManipulator(this._guild.id).config.volume_maximum ?? this._fallback_guild_volume_maximum;
        return guild_volume_maximum;
    }
    async decreaseVolume(decrease_amount=10, clamp_volume=true) {
        this.setVolume(this.volume - decrease_amount, undefined, clamp_volume);
        return [this, decrease_amount];
    }
    async increaseVolume(increase_amount=10, clamp_volume=true) {
        this.setVolume(this.volume + increase_amount, undefined, clamp_volume);
        return [this, increase_amount];
    }
    /**
     * Sets the volume for a Guild Audio Dispatcher
     * @param {Number} volume_input the volume being passed
     * @param {Boolean} update_last_volume changed the recorded last volume set
     * @param {Boolean} clamp_volume keep the volume within the guild's preferred maximum volume
     * @returns {VolumeManager} 
     */
    async setVolume(volume_input=this._fallback_volume, update_last_volume=true, clamp_volume=true) {
        if (this._guild.voice?.connection?.dispatcher?.setVolume) {
            this._last_volume = update_last_volume ? this.volume : this.last_volume;

            this._volume = math_clamp(volume_input, 0, clamp_volume ? this.maximum : Number.MAX_SAFE_INTEGER);

            this._guild.voice.connection.dispatcher.setVolume(this.multiplier * this.volume);
            if (typeof this.volume !== 'number' || isNaN(this.volume)) {
                console.trace('ERROR: Volume is somehow not a number!');
                this._volume = this._fallback_volume;
            }
        }
        return this;
    }
    async toggleMute(override=undefined) {
        this._muted = override ?? !this.muted;
        this.setVolume(this.muted ? 0 : this.last_volume, false);
        return this;
    }
}

module.exports = {
    VolumeManager,
};
