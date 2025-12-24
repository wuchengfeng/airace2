接下来，我们融入AI功能。词表仅负责维护单词即可，并且可以批量粘贴单词进来。1阶段~3阶段的所有内容都是基于AI动态生成的。
多维表的key：
teable_accsycMTCgM8G1mCf6n_wfkhmUWND3fHv//nOpMJ7afOY5Rgem8MBkKAkcxHgCE=
### 这是鉴权用到的key
APPID:API Key
<APP_ID>:<APP_KEY>

### 调用的参考代码：
curl --location 'http://ai-service.tal.com/openai-compatible/v1/chat/completions' \
--header "Authorization: Bearer ${TAL_MLOPS_APP_ID}:${TAL_MLOPS_APP_KEY}" \
--header 'Content-Type: application/json' \
--data '{
    "model": "gpt-4.1",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful assistant."
        },
        {
            "role": "user", 
            "content": "你是谁？"
        }
    ]
}'


### 实际调用代码：
#### 调用示例：
curl --location 'http://ai-service.tal.com/openai-compatible/v1/chat/completions' \
--header "Authorization: Bearer <APP_ID>:<APP_KEY>" \
--header 'Content-Type: application/json' \
--data '{
    "model": "gpt-4.1",
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful assistant."
        },
        {
            "role": "user", 
            "content": "你是谁？"
        }
    ]
}'

#### 返回内容：
{
    "id": "0a40225f6947bb68aed5cec453000020",
    "object": "chat.completion",
    "model": "gpt-41",
    "created": 1766308712,
    "system_fingerprint": "",
    "usage": {
        "completion_tokens": 52,
        "completion_tokens_details": {
            "accepted_prediction_tokens": 0,
            "audio_tokens": 0,
            "reasoning_tokens": 0,
            "rejected_prediction_tokens": 0
        },
        "prompt_tokens": 20,
        "prompt_tokens_details": {
            "audio_tokens": 0,
            "cached_tokens": 0
        },
        "total_tokens": 72
    },
    "choices": [
        {
            "content_filter_results": {
                "hate": {
                    "filtered": false,
                    "severity": "safe"
                },
                "self_harm": {
                    "filtered": false,
                    "severity": "safe"
                },
                "sexual": {
                    "filtered": false,
                    "severity": "safe"
                },
                "violence": {
                    "filtered": false,
                    "severity": "safe"
                }
            },
            "finish_reason": "stop",
            "index": 0,
            "logprobs": null,
            "message": {
                "annotations": [],
                "content": "你好！我是由OpenAI开发的人工智能助手，可以用中文或其他语言回答你的问题，帮助你解决各种问题。不管是学习、工作还是生活中的疑问，都可以随时问我哦！你需要什么帮助吗？",
                "refusal": null,
                "role": "assistant"
            }
        }
    ]
}
