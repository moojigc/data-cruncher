import re


def find_child_matches(match: re.Match, other_matches: list[re.Match]):
    child_matches: list[re.Match] = []

    for other_match in other_matches:

        if other_match != match and \
            match.start() <= other_match.start() <= match.end() \
                and match.start() <= other_match.end() <= match.end():
            child_matches.append(other_match)

    return child_matches


def get_match_len(match):
    return match.end() - match.start()


# def find_longest_match(matches: list[re.Match]):
#     longest_match = matches[0]

#     for match in matches:
#         if get_match_len(match) > get_match_len(longest_match):
#             longest_match = match

#     return longest_match


def find_unique_matches(matches: list[re.Match]):
    match_dict: dict[re.Match, list[re.Match]] = {}

    for match in matches:
        child_matches = find_child_matches(match, matches)
        if len(child_matches) > 0:
            match_dict[match] = child_matches
            # At this point, we have a dictionary that looks like this,
            # and may still have duplicates:
            # actual_unique_matches = {
            #     re.Match1: [re.Match2, re.Match3],
            #     re.Match2: [re.Match3],
            #     re.Match4: [re.Match5, re.Match6],
            # }

    duplicates: set[re.Match] = set()

    # Now, we need to remove duplicates from the dictionary.
    for child_matches in match_dict.values():
        # print(
        #     f"Outer loop key: {longer_match.group()}, value: {child_matches}")
        # outer loop is: re.Match1, [re.Match2, re.Match3]
        for longer_match in match_dict.keys():
            # inner loop is: re.Match1, re.Match2, re.Match4
            if longer_match in child_matches:
                duplicates.add(longer_match)
                # print(f"\"{inner_loop_key.group()}\" has duplicates: {value}")

    actual_unique_matches: list[re.Match] = []

    for key in match_dict:
        if key not in duplicates:
            actual_unique_matches.append(key)

    return actual_unique_matches


def main():
    notes = ["My name is lil mochi, I'm so cute"]
    regexes = [r"My name is", r"My name", r"name", r"I'm so cute", r"so cute"]

    matches = []

    for note in notes:
        for regex in regexes:
            for match in re.finditer(pattern=regex, string=note):
                matches.append(match)

    unique_matches = find_unique_matches(matches)
    print(f"Unique matches: {unique_matches}")


if __name__ == "__main__":
    main()
