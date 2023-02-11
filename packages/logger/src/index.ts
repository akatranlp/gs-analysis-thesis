export const createLogger = (name: string) => (str: any) => {
  console.log(`${name}: `, str);
}
