# Contracts

One file per module (`identity.ts`, `org.ts`, `people.ts`, `authz.ts`, `space.ts`, …) with the Zod
schema of every Server Action and Route Handler input and output (TECH-01 P7, §7). FE builds against
the schema and the fake in `fakes/` before BE finishes; a module is switched to real only when its
contract tests pass against both adapters (TECH-01 §11).
