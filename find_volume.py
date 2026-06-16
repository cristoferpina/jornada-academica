import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

volumes = [
    "0d2c5586e95a58724b9ba668176725af03a218a0e2f4bb667426cfe1b64cc10b",
    "1f98bfd012617c05fb13c6a91175c9c94d0b3521cdedeeb18abf6d14e43c806a",
    "2e4ce8a49a031dc2dcaf07d91baa86d3b2e260662b21d9c6b0b26559482adb21",
    "02f1c161b0fb346e16f1453b9e54d5ca574c78f8924f771c1f2340c3bde978a0",
    "3b363af2ced22b6f3c1ea9412811eeef940b71f5b2ab6068dc11f2188f6615a4",
    "3d56989a9d07d55cdea2665bb1d15ac35f4412adc1cce6831d4dece5b3285451",
    "4abca80a7422277b1b1411fba087b9d6758611c5ae41c7c93811088cfa73dfa9",
    "5b10650e38bd744acf96403f5732686cf147f3fdb5375329541ac9d92f375f83",
    "5d270e78d8f276ae4b38260438ef10bed43c545fd71bb8e0b5ca93386df79204",
    "05dc540d11696204671e51f36edef8b9dfba584343959205235fc9952456cd45",
    "6db2e0daed63060e9a22323e460a69c649c9ea861ee6bbb76b4e4f94922cfe45",
    "8dd26685664103bdb72214e85ba58dc4d8275683f01c50cc13db2624179d8ef7",
    "18e3775c736f768d8222c48db48620e5671d2a710abe43a8edd5e4146c5cf203",
    "27ef5a363c4aa4f857ff0dd62718e628e8f283b219a1637aca62ba613199abbf",
    "75fa97a799da549164d56b552546b0018fd08086d641fe7ae790d57615762930",
    "098ad37c924287d0f9fcebe1cc38c7d3d6fc01aca0614460ee39ae50eab42907",
    "201d148a23555e44bb2abd3ef341bc54304eb21967b96dd899aa3cbff4314f28",
    "349f06a716a44edb296f38194d7ed44eaeb4f36b39f1b4ca84a2feddc9ac9ab3",
    "0483b63892ca81e6b821dba284dade53aca3126077e2ab8abe73b789f9ba02e7",
    "571ed40edbc754a63c0a43a873ea6ceeaef64102558441dd864b58476a76ab3e",
    "832d57191fde79d3924947b6918004d11a2f582796f1c4c21a34c121f05fd3f1",
    "931d973ba7a06a83c2bd1ddd9ed7ad6bcf5e701212fb7d00e15835a58c328fc8",
    "2528caf12a343408e7a2ed43bb2e4aac08eb2656c0c2c0510d014ef100d0bab8",
    "2572e11779fb7b09b4619d035828566a6d51ef54a738a1f5dffa2bcaec2704df",
    "4119bb1c50a29d9749e4ce58b0b847d15273465280f934827e5bea864d7b20fc",
    "9753e6c00f243b878f1ee76d86ab4fc3a7ce28229b78613e63ce7f79f0b27e60",
    "44051a280c080017451cc924d40956841e6773875266c3061e62aa1e8d3f0e2b",
    "3669325af5837da190b7e3bcd9c47aeb4f80cdc7e868dd52cd3ad59b97da35d9",
    "31708385cc268a22365cce8fd0b3fffed9a0d6921147018d35d1c8c9cf88a890",
    "a3d85bbd5526434cbb6878c699396bbe7a207b9d8246f7764f3b248a1c0c9664",
    "a92f37a8d7eaf982ede2f5316eb94a3acf5f3f0443ed1e095bf9c44fe478d2ab",
    "b549cfb8b53164e2f56cf02e45442bfc59291d38df2bc25f6f3f2311e34e699b",
    "bd41888b6b88ba0526d5eba34c0dc4b99656c2fb85579386a55b3d5acece7307",
    "c8449998bdbeef81a4c6dea8547a8527e3cc86caa63076b7e475dd5f68302f8a",
    "dd120a9d38407f315702f40c6b215fb940141532ce89d72a74c8d655534b88b1",
    "ddf070bf194041ca1b45e41070b8e991ddd5a3ad62505569becc41b9c24cf4fd",
    "def67706ca0b58f66afdbfb782a78717edaa96f22a8011948ebdba7f01ec1f73",
    "e0fe7841d4081449b800b1d8efeded8e232748ad77b8062ad5e6007792db35b4",
    "e6fcd88103caa1fb6e7fe17304c24b632eaf51d0ef85a5f0f9d525ba1a6a6178",
    "e53a3c85fdab5f1cb1b70ce08cbcad5ba4629de136e793129b5ba6ba672da16a",
    "f2effbfd4649a9f0ad07e9c6853141abe1b5920fcf27f409b4054c13b65f0562",
    "f16cfe6edcdae53460fab622e94fa33dc39b9243c7b71518d6a638241f3341c1",
    "f175d899fb42263c2dc70af8a3d758070bfc96504a1df2c554dacbf57f1ec4d5",
    "fa319978a100195291e0c511419db3eea9244a51fe420f03a5871859b838555f",
    "fcb3a55e4d719d7eabf89949ab47f75fb4bba16fa1452dc42409ea395e28b2ee",
    "feb2deb15e0e0de3f9a78da47c25947f8920f9e6bdf51e945f23d8c60fb7b939",
    "jornada_academica_postgres_data"
]

target_email = 'luisramon13sjr@umb.edu.mx'

def check_volume(vol):
    print(f"Checking {vol}...", flush=True)
    cmd = [
        "docker", "run", "--rm",
        "-v", f"{vol}:/var/lib/postgresql/data",
        "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:16",
        "bash", "-c",
        f"timeout 15s bash -c 'until pg_isready -U postgres > /dev/null 2>&1; do sleep 0.5; done' && psql -U postgres -d jornada_db -c \"SELECT email FROM users WHERE email = '{target_email}';\" 2>/dev/null"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if target_email in result.stdout:
            return vol
    except Exception:
        pass
    return None

with ThreadPoolExecutor(max_workers=4) as executor:
    results = executor.map(check_volume, volumes)
    for res in results:
        if res:
            print(f"FOUND: {res}", flush=True)
            # We found it, but executor.map continues until all are done or we stop it.
            # To be efficient we just exit.
            sys.exit(0)
