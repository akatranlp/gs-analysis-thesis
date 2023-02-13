import { useCallback, useEffect, useState } from "react";

export const useLocalStorage = <T>(key: string, defaultValue: T | (() => T)) => {
    return useStorage(key, defaultValue, window.localStorage);
}
export const useSessionStorage = <T>(key: string, defaultValue: T | (() => T)) => {
    return useStorage(key, defaultValue, window.sessionStorage);
}

const isFunction = (value: any): value is CallableFunction => {
    return typeof value === "function";
}

const useStorage = <T>(key: string, defaultValue: T | (() => T), storageObject: Storage) => {
    const [value, setValue] = useState(() => {
        const jsonValue = storageObject.getItem(key)
        if (jsonValue != null) return JSON.parse(jsonValue) as T | undefined
        return isFunction(defaultValue) ? defaultValue() : defaultValue;
    });

    useEffect(() => {
        if (value === undefined) return storageObject.removeItem(key)
        storageObject.setItem(key, JSON.stringify(value))
    }, [key, value, storageObject]);

    const remove = useCallback(() => {
        setValue(undefined);
    }, []);

    return { value, setValue, remove }
}