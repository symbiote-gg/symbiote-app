import licensesUrl from "@/generated/licenses.json?url";

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
    const response = await fetch(licensesUrl);
    if (!response.ok) {
        throw new Error(`Failed to load licenses: ${response.status}`);
    }

    return response.json();
}
