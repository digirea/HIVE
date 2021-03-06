#
# Edit `config` line to fit in your environemnt.
#

# To install fabric and cuisne,
#
#   # update setuptools
#   $ sudo pip install -U setuptools
#   $ sudo pip install setuptools
#
#   $ sudo pip install fabric
#   $ sudo pip install cuisine
#
# You may need to speicfy ARCHFLAGFS on MacOSX environemnt.
# (https://langui.sh/2014/03/10/wunused-command-line-argument-hard-error-in-future-is-a-harsh-mistress/)
#
#   $ sudo ARCHFLAGS=-Wno-error=unused-command-line-argument-hard-error-in-future pip install fabric
#
#
import os, sys
import json
from fabric.api import (env, sudo, put, get, cd, local)
from fabric.utils import puts
from fabric.colors import green, magenta
from fabric.decorators import task
from cuisine import (run, dir_ensure, dir_exists, file_exists)

# ----- config --------------------------------------------

config_file = "hostconfig.json"
env.use_ssh_config = True

# ---------------------------------------------------------

config = json.loads(open(config_file).read())
env.hosts = config['hosts']

file_hashes = {
    'cmake-2.8.12.2.tar.gz' : '8c6574e9afabcb9fc66f463bb1f2f051958d86c85c37fccf067eb1a44a120e5e'
}


@task
def prepare():
    puts(green('Prepare tools'))

    remote_build_dir = config['config'][env.host_string]['remote_build_dir']
    build_cmake = config['config'][env.host_string]['build_cmake']

    dir_ensure(remote_build_dir)

    puts(magenta('remote_build_dir: ' + remote_build_dir))
    puts(magenta('build_cmake: %d' % build_cmake))

    if build_cmake == True:
        if not os.path.exists('./deploy/cmake-2.8.12.2.tar.gz'):
            local('curl http://www.cmake.org/files/v2.8/cmake-2.8.12.2.tar.gz -o deploy/cmake-2.8.12.2.tar.gz')

        put('deploy/cmake-2.8.12.2.tar.gz', remote_build_dir + '/cmake-2.8.12.2.tar.gz')
        with cd(remote_build_dir):
            dest_dir = os.path.join(remote_build_dir, 'tools')
            run('rm -rf cmake-2.8.12.2')
            run('tar -zxvf cmake-2.8.12.2.tar.gz')
            run('cd cmake-2.8.12.2; ./configure --prefix=' + dest_dir + ' && make && make install')


@task
def build():
    remote_build_dir = config['config'][env.host_string]['remote_build_dir']

    if not dir_exists(remote_build_dir):
        dir_ensure(remote_build_dir, recursive=True)

    dir_ensure(remote_build_dir + '/build')

    build_hive()

# Dependency: (None)
@task
def build_hive():
    puts(green('Configuring HIVE'))

    remote_build_dir = config['config'][env.host_string]['remote_build_dir']
    host_type = config['config'][env.host_string]['type']
    build_cmake = config['config'][env.host_string]['build_cmake']
    c_compiler = config['config'][env.host_string]['c_compiler']
    cxx_compiler = config['config'][env.host_string]['cxx_compiler']

    local('./scripts/git-archive-all.sh --prefix HIVE-master/ deploy/HIVE-master.tar') # --format tar.gz doesn't work well.
    local('gzip -f deploy/HIVE-master.tar')
    put('deploy/HIVE-master.tar.gz', remote_build_dir + '/HIVE-master.tar.gz')

    with cd(remote_build_dir):
        run('rm -rf HIVE-master')
        run('tar -zxvf HIVE-master.tar.gz')

    # put deplibs
    put('third_party/fpzip-1.0.1.tar.gz', remote_build_dir + '/HIVE-master/third_party/fpzip-1.0.1.tar.gz')
    put('third_party/cgnslib_3.2.1.tar.gz', remote_build_dir + '/HIVE-master/third_party/cgnslib_3.2.1.tar.gz')
    put('third_party/zoltan_distrib_v3.81.tar.gz', remote_build_dir + '/HIVE-master/third_party/zoltan_distrib_v3.81.tar.gz')

    # build loader libs.
    loader_build_script = ""
    if host_type == 'k_cross':
        loader_build_script = './scripts/build_loader_libs_k_cross.sh'
    elif host_type == 'linux64':
        loader_build_script = './scripts/build_loader_libs_linux-x64.sh'
    elif host_type == 'darwin64':
        loader_build_script = './scripts/build_loader_libs_macosx.sh'
    else:
        print(host_type)
        raise # todo

    if build_cmake == True:
        cmake_bin_path = os.path.join(config['config'][env.host_string]['remote_build_dir'], "tools/bin/cmake")
        loader_build_script = "CMAKE_BIN=" + cmake_bin_path + ' ' + loader_build_script

    if c_compiler is not None:
        loader_build_script = "CC=" + c_compiler + ' ' + loader_build_script

    if cxx_compiler is not None:
        loader_build_script = "CXX=" + cxx_compiler + ' ' + loader_build_script

    #run('module load PrgEnv-intel')
    #run('module load impi411')

    with cd(remote_build_dir + '/HIVE-master'):
        run(loader_build_script)
        #run('make -C build')
    
    #setup_script = ""
    #if host_type == 'k_cross':
    #    setup_script = './scripts/cmake_k_cross.sh'
    #elif host_type == 'linux64':
    #    setup_script = './scripts/cmake_linux_x64.sh'
    #elif host_type == 'darwin64':
    #    setup_script = './scripts/cmake_macosx.sh'
    #else:
    #    print(host_type)
    #    raise # todo

    #if build_cmake == True:
    #    cmake_bin_path = os.path.join(config['config'][env.host_string]['remote_build_dir'], "tools/bin/cmake")
    #    setup_script = "CMAKE_BIN=" + cmake_bin_path + ' ' + setup_script

    #with cd(remote_build_dir + '/HIVE-master'):
    #    run(setup_script)
    #    run('make -C build')

# Dependency: (None)
@task
def deploy_vsp():
    puts(green('Putting HIVE to vsp'))
    env.hosts = ['vsp']

    local('./scripts/git-archive-all.sh --prefix HIVE-master/ deploy/HIVE-master.tar') # --format tar.gz doesn't work well.
    local('gzip -f deploy/HIVE-master.tar')
    put('deploy/HIVE-master.tar.gz', '/media/dali/data1/share/HIVE/release/HIVE-master.tar.gz')
