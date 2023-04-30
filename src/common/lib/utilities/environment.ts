//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

/**
 * Parses an environment variable.
 * Will throw if the environment variable is not set, empty, or not valid for the specified parse type.
 */
export function parseEnvironmentVariable(variable_name: string, parse_type: 'string'): string;
export function parseEnvironmentVariable(variable_name: string, parse_type: 'number'): number;
export function parseEnvironmentVariable(variable_name: string, parse_type: string) {
    switch (parse_type) {
        case 'string': {
            const environment_variable = process.env[variable_name];

            if (environment_variable === undefined) throw new Error(`${variable_name} environment variable is not set`);
            if (environment_variable.length < 1) throw new Error(`${variable_name} environment variable is empty`);

            return environment_variable;
        }

        case 'number': {
            const environment_variable = process.env[variable_name];

            if (environment_variable === undefined) throw new Error(`${variable_name} environment variable is not set`);
            if (environment_variable.length < 1) throw new Error(`${variable_name} environment variable is empty`);

            const parsed_environment_variable = Number.parseInt(environment_variable, 10);
            if (Number.isNaN(parsed_environment_variable)) throw new Error(`${variable_name} environment variable is not a valid number`);

            return parsed_environment_variable;
        }

        default: {
            throw new Error(`parseEnvironmentVariable(): Unknown parse type '${parse_type}'`);
        }
    }
}
