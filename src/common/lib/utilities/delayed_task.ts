//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { delay } from '.';

//------------------------------------------------------------//

export type DelayedTaskCallback = () => void | Promise<void>;

//------------------------------------------------------------//

/**
 * A task that is executed after a specified delay.
 * This should be used in conjunction with a `DelayedTaskQueue`.
 */
export class DelayedTask {
    public constructor(
        public readonly delay_ms: number,
        private readonly _callback: DelayedTaskCallback,
    ) {}

    /**
     * Executes the callback after the specified delay.
     */
    public async execute(): Promise<void> {
        await delay(this.delay_ms);
        await this._callback();
    }
}

//------------------------------------------------------------//

/**
 * A queue of tasks that are executed in order after a specified delay (per task).
 * This should primarily be used for tasks that need throttling.
 * Also useful for synchronizing tasks that are asynchronous.
 */
export class DelayedTaskQueue {
    public active: boolean = false;
    public stack: DelayedTask[] = [];

    public constructor() {}

    /**
     * Processes the next task in the queue and then recursively calls itself until the queue is empty.
     */
    private async _process(): Promise<void> {
        this.active = true;

        const task = this.stack.shift();
        if (task) await task.execute();

        if (this.stack.length > 0) await this._process();

        this.active = false;
    }

    /**
     * Enqueues a task to be executed after all other tasks in the queue.
     * @param task the task to enqueue
     * @param next [default: false] if true, will be inserted at the front of the queue
     */
    public enqueue(
        task: DelayedTask,
        next: boolean = false,
    ): void {
        if (next) this.stack.unshift(task);
        else this.stack.push(task);

        if (!this.active) this._process();
    }
}
