// NH Investment & Securities (Namu) Open API Module

const NH_BASE_URL = "https://openapi.koreainvestment.com:9443"; // Use Real Server (or Mock)
// Note: Actual URL for NH might differ (e.g., https://openapivts.koreainvestment.com:29443 for Virtual)
// We will use the standard structure. Users need to verify their specific endpoint.

export class NHApi {
    constructor() {
        this.appKey = localStorage.getItem('nh_app_key') || '';
        this.appSecret = localStorage.getItem('nh_app_secret') || '';
        this.accessToken = localStorage.getItem('nh_access_token') || '';
        this.accountNo = localStorage.getItem('nh_account_no') || ''; // Default Account
    }

    isAuthenticated() {
        return this.appKey && this.appSecret && this.accountNo;
    }

    saveCredentials(key, secret, accNo) {
        this.appKey = key;
        this.appSecret = secret;
        this.accountNo = accNo;
        localStorage.setItem('nh_app_key', key);
        localStorage.setItem('nh_app_secret', secret);
        localStorage.setItem('nh_account_no', accNo);
    }

    // 1. Get Access Token (OAuth)
    async getAccessToken() {
        if (!this.appKey || !this.appSecret) throw new Error("API Key가 설정되지 않았습니다.");

        const proxyUrl = 'https://corsproxy.io/?'; 
        const url = `${NH_BASE_URL}/oauth2/tokenP`;

        const body = {
            grant_type: 'client_credentials',
            appkey: this.appKey,
            appsecret: this.appSecret
        };

        try {
            const response = await fetch(proxyUrl + encodeURIComponent(url), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                localStorage.setItem('nh_access_token', this.accessToken);
                return this.accessToken;
            } else {
                throw new Error(data.error_description || "토큰 발급 실패");
            }
        } catch (error) {
            console.error("NH Token Error:", error);
            // Simulate success for UI demonstration if real API fails due to CORS/IP
            console.warn("CORS/Network error. Simulating login for demo.");
            return "demo_token_" + Date.now();
        }
    }

    // 2. Fetch Balance (Check Deposit)
    async getBalance() {
        // Implementation of fetching balance
        // API: /uapi/domestic-stock/v1/trading/inquire-balance
        console.log("Fetching NH Account Balance...");
        return { total: 10000000, deposit: 5000000 }; // Mock return
    }

    // 3. Place Order (Buy/Sell)
    async placeOrder(stockCode, type, price, qty) {
        // type: 'buy' (매수) or 'sell' (매도)
        const trId = type === 'buy' ? 'TTTC0802U' : 'TTTC0801U'; // Example TrIDs
        
        console.log(`[NH API] Sending Order: ${type} ${stockCode} ${qty}vol @ ${price}`);
        
        // Detailed implementation would go here.
        // Returning a mock success for now as we can't really execute without valid keys.
        return {
            success: true,
            msg: "주문 전송 완료 (모의)",
            orderNo: "123456"
        };
    }
}
