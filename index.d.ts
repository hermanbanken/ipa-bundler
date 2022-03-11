#! /usr/bin/env node
/// <reference types="node" />
declare type OptOptions = {
    outDir: string;
    htmlFile: string;
    manifestFile: string;
};
declare type AppDetails = {
    bundleVersion: string;
    bundleMarketingVersion: string;
    bundleIdentifier: string;
    appTitle: string;
    appIcon: Buffer;
};
declare type ReqOptions = {
    /**
    * Absolute url, or relative to manifest file (and html file)
    */
    ipaUrl: string;
} & (AppDetails | {
    ipaPath: string;
});
declare type InputOptions = ReqOptions & Partial<OptOptions>;
export declare function createBundle(inputOptions: InputOptions): Promise<{
    [x: string]: string;
}>;
export declare function writeBundle(inputOptions: InputOptions): Promise<any[]>;
export declare function link(manifest: string): string;
export declare function html(manifest: string, options: AppDetails): string;
export declare function manifest(ipaUrl: string, options: AppDetails): string;
export {};
