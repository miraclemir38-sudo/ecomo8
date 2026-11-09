import re

with open("services/geminiService.ts", "r") as f:
    content = f.read()

old_block = """    const parsed = JSON.parse(response.text || "{}");
    return {
        title: parsed.title || "제목 없음",
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        pinnedComment: parsed.pinnedComment || ""
    };"""

new_block = """    let parsed: any = {};
    try {
        parsed = JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Failed to parse generateYouTubeMetadata response JSON", e);
    }
    return {
        title: parsed.title || "제목 없음",
        description: parsed.description || "",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        pinnedComment: parsed.pinnedComment || ""
    };"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("services/geminiService.ts", "w") as f:
        f.write(content)
    print("Successfully replaced generateYouTubeMetadata block")
else:
    print("Could not find block to replace for generateYouTubeMetadata")
