export const getMilliSecondsToInterval = (interval: number) => {
    const coeff = 1000 * 60 * interval;
    const currentDate = new Date()
    const date = new Date(Math.ceil(currentDate.getTime() / coeff) * coeff);

    return date.getTime() - currentDate.getTime();
}
