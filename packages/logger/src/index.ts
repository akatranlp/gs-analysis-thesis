export const createLogger = (name: string) => (...args: any) => {
  console.log(`${name}: `, ...args);
}
