use std::env;
use std::fs;
use std::process;

use concept_mapper_core::graph::assemble;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        eprintln!("Usage: concept-mapper <input.md>");
        process::exit(1);
    }

    let input_path = &args[1];

    let input = match fs::read_to_string(input_path) {
        Ok(content) => content,
        Err(e) => {
            eprintln!("error: could not read '{}': {}", input_path, e);
            process::exit(1);
        }
    };

    match assemble::parse_document(&input, Some(input_path)) {
        Ok(result) => {
            // Print warnings to stderr
            for warning in &result.warnings {
                eprintln!("{}", warning);
            }

            // Print JSON to stdout
            match serde_json::to_string_pretty(&result.graph) {
                Ok(json) => println!("{}", json),
                Err(e) => {
                    eprintln!("error: failed to serialize JSON: {}", e);
                    process::exit(1);
                }
            }
        }
        Err(errors) => {
            for error in &errors {
                eprintln!("{}", error);
            }
            process::exit(1);
        }
    }
}
