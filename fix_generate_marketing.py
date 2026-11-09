import re

with open("services/geminiService.ts", "r") as f:
    content = f.read()

old_block = """        const parsed = JSON.parse(response.text || "{}");
        return {
            titles: parsed.titles || [],
            description: parsed.description || "",
            tags: parsed.tags || [],
            pinnedComment: parsed.pinnedComment || "",
            thumbnails: parsed.thumbnails || []
        };"""

new_block = """        let parsed: any = {};
        try {
            parsed = JSON.parse(response.text || "{}");
        } catch (e) {
            console.error("Failed to parse generateMarketingKit response JSON", e);
        }
        return {
            titles: parsed.titles || [],
            description: parsed.description || "",
            tags: parsed.tags || [],
            pinnedComment: parsed.pinnedComment || "",
            thumbnails: parsed.thumbnails || []
        };"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open("services/geminiService.ts", "w") as f:
        f.write(content)
    print("Successfully replaced generateMarketingKit block")
else:
    print("Could not find block to replace for generateMarketingKit")
