import {getSessionToken} from "../src/utils/CryptoHelper"
import MD5 from 'crypto-js/md5';

describe("CRYPTO HELPER TESTS: Create Session Token", () => {
    it("values are the same", () => {
        const date = new Date();
        const session1 = getSessionToken("1234", 30512, "0Nz4Ex87NV12SmwpSgr5", date);
        const session2 = getSessionToken("1234", 30512, "0Nz4Ex87NV12SmwpSgr5", date);
        expect(session1).toBe(session2);
    });

    it("format is correct", () => {
        const date = new Date();
        const userId = "1234";
        const appId = 30512;
        const apiKey = "0Nz4Ex87NV12SmwpSgr5";
        const seconds = Math.round(date.getTime() / 1000);
        const session1 = getSessionToken(userId, appId, apiKey, date);
        const sessionArray = session1.split("=");

        expect(sessionArray.length).toBe(4);
        expect(sessionArray[0]).toBe('30512');
        expect(sessionArray[1]).toBe("1234");
        expect(sessionArray[2]).toBe(Math.round(date.getTime() / 1000).toString());
        expect(sessionArray[3]).toBe(MD5(userId + seconds + apiKey).toString());
    });
});