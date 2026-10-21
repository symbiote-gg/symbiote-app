export type ThirdPartyPackage = {
    name: string;
    version: string;
    license: string;
    url: string;
    texts: number[];
};

export type ThirdPartyLicenses = {
    texts: string[];
    packages: ThirdPartyPackage[];
};

export async function getThirdPartyLicenses(): Promise<ThirdPartyLicenses> {
    const res = await fetch("/licenses.json");
    if (!res.ok) throw new Error(`${res.status} /licenses.json`);
    return res.json();
}
