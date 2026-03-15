import { requireEnv } from "~/lib/app-env.server";

type CreateMayarPaymentInput = {
	name: string;
	email: string;
	mobile: string;
	amount: number;
	description: string;
	redirectUrl: string;
};

type MayarCreatePaymentResponse = {
	id?: string;
	transactionId?: string;
	paymentLink?: string;
	paymentUrl?: string;
	url?: string;
};

type MayarPaymentDetailResponse = {
	id?: string;
	transactionId?: string;
	status?: string;
	amount?: number;
	payerEmail?: string;
	payerPhone?: string;
};

function getBaseUrl() {
	return requireEnv("MAYAR_API_BASE_URL").replace(/\/$/, "");
}

function getHeaders() {
	return {
		Authorization: `Bearer ${requireEnv("MAYAR_API_KEY")}`,
		"Content-Type": "application/json",
	};
}

export async function createMayarPaymentLink(input: CreateMayarPaymentInput) {
	const response = await fetch(`${getBaseUrl()}/payment/create`, {
		method: "POST",
		headers: getHeaders(),
		body: JSON.stringify({
			name: input.name,
			email: input.email,
			mobile: input.mobile,
			amount: input.amount,
			description: input.description,
			redirection_url: input.redirectUrl,
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to create Mayar payment link (${response.status})`);
	}

	const payload = (await response.json()) as MayarCreatePaymentResponse;
	const paymentLink = payload.paymentLink ?? payload.paymentUrl ?? payload.url;

	if (!payload.id || !paymentLink) {
		throw new Error("Mayar create payment response was incomplete");
	}

	return {
		id: payload.id,
		transactionId: payload.transactionId,
		paymentLink,
	};
}

export async function fetchMayarPaymentDetail(paymentId: string) {
	const response = await fetch(`${getBaseUrl()}/payment/${paymentId}`, {
		headers: getHeaders(),
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch Mayar payment detail (${response.status})`);
	}

	return (await response.json()) as MayarPaymentDetailResponse;
}
